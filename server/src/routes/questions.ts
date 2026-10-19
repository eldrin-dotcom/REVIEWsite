import { Router, Response } from 'express';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { examTypes, subjects, topics, questions, quizAnswers, quizSessions } from '../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import type { QuestionBankUpload } from 'shared';

export const questionsRouter = Router();
questionsRouter.use(requireAuth);

/**
 * Auto-detects whether a question is conceptual or computation
 * based on math notation ($..$), engineering units, numbers, and calculation keywords.
 */
function inferQuestionType(q: { type?: string; text: string; choices: string[]; explanation?: string | null }): 'conceptual' | 'computation' {
  if (q.type === 'computation' || q.type === 'conceptual') {
    return q.type;
  }
  const text = `${q.text} ${q.choices.join(' ')} ${q.explanation || ''}`.toLowerCase();
  const computationIndicator = /(\$|\\frac|\\sqrt|\\times|\\approx|\bcalculate\b|\bcompute\b|\bdetermine\b|\bfind the value\b|\bwhat is the value\b|\bresistance\b|\bcapacitance\b|\binductance\b|\bvoltage\b|\bcurrent\b|\bfrequency\b|\bohms?\b|\bvolts?\b|\bamperes?\b|\bhertz\b|\bwatts?\b|\bdecibels?\b|\bhenry\b|\bfarads?\b|[\d.]+\s*(v|mv|uv|a|ma|ua|hz|khz|mhz|ghz|pf|nf|uf|f|w|kw|mw|db|rad\/s|\\omega|\\mu|\\pi))/i;
  return computationIndicator.test(text) ? 'computation' : 'conceptual';
}

// Get all exam types with subjects and topics count
questionsRouter.get('/hierarchy', async (_req, res) => {
  try {
    const db = getDb();
    const allExamTypes = await db.select().from(examTypes).all();
    const allSubjects = await db.select().from(subjects).all();
    const allTopics = await db.select().from(topics).all();

    // Count questions per topic
    const questionCounts = await db
      .select({
        topicId: questions.topicId,
        count: sql<number>`count(*)`.as('count'),
      })
      .from(questions)
      .groupBy(questions.topicId)
      .all();

    const countMap = new Map<number, number>();
    for (const qc of questionCounts) {
      countMap.set(qc.topicId, Number(qc.count));
    }

    const result = allExamTypes.map((et) => {
      const etSubjects = allSubjects
        .filter((s) => s.examTypeId === et.id)
        .map((s) => {
          const sTopics = allTopics
            .filter((t) => t.subjectId === s.id)
            .map((t) => ({
              ...t,
              questionCount: countMap.get(t.id) || 0,
            }));
          return {
            ...s,
            topics: sTopics,
          };
        });
      return {
        ...et,
        subjects: etSubjects,
      };
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching hierarchy:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch question hierarchy' });
  }
});

// Upload and parse JSON question bank
questionsRouter.post('/upload', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payload = req.body as QuestionBankUpload;

    if (!payload.examType || !payload.subject || !payload.topic || !Array.isArray(payload.questions)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid format. Required: examType, subject, topic, and questions array',
      });
    }

    const db = getDb();

    // 1. Find or validate exam type
    let targetExamType = await db.select().from(examTypes).where(eq(examTypes.name, payload.examType.trim())).get();
    if (!targetExamType) {
      // Check case-insensitive
      const all = await db.select().from(examTypes).all();
      targetExamType = all.find(e => e.name.toLowerCase() === payload.examType.trim().toLowerCase());
      if (!targetExamType) {
        return res.status(400).json({
          success: false,
          error: `Exam type '${payload.examType}' not recognized. Allowed: Pre-board, ECT`,
        });
      }
    }

    // 2. Find or validate subject under this exam type
    const subjList = await db.select().from(subjects).where(eq(subjects.examTypeId, targetExamType.id)).all();
    let targetSubject = subjList.find(s => s.name.toLowerCase() === payload.subject.trim().toLowerCase());
    if (!targetSubject) {
      return res.status(400).json({
        success: false,
        error: `Subject '${payload.subject}' not found under '${targetExamType.name}'. Available: ${subjList.map(s => s.name).join(', ')}`,
      });
    }

    // 3. Find or auto-create topic
    let targetTopic = await db.select().from(topics).where(
      and(
        eq(topics.subjectId, targetSubject.id),
        eq(topics.name, payload.topic.trim())
      )
    ).get();

    let topicCreated = false;
    if (!targetTopic) {
      const insertResult = await db.insert(topics).values({
        subjectId: targetSubject.id,
        name: payload.topic.trim(),
      }).returning().get();
      targetTopic = insertResult;
      topicCreated = true;
    }

    // 4. Validate and insert questions
    const existingQuestions = await db.select().from(questions).where(eq(questions.topicId, targetTopic.id)).all();
    const existingTexts = new Set(existingQuestions.map(q => q.text.trim().toLowerCase()));

    let importedCount = 0;
    let duplicateCount = 0;
    const errors: string[] = [];

    const toInsert: Array<typeof questions.$inferInsert> = [];

    for (let i = 0; i < payload.questions.length; i++) {
      const q = payload.questions[i];
      if (!q.text || !Array.isArray(q.choices) || q.choices.length < 2 || typeof q.answer !== 'number') {
        errors.push(`Item #${i + 1}: Missing text, choices, or answer index`);
        continue;
      }

      if (q.answer < 0 || q.answer >= q.choices.length) {
        errors.push(`Item #${i + 1}: Answer index ${q.answer} is out of bounds for choices (length ${q.choices.length})`);
        continue;
      }

      const normalizedText = q.text.trim().toLowerCase();
      if (existingTexts.has(normalizedText)) {
        duplicateCount++;
        continue;
      }

      existingTexts.add(normalizedText);

      toInsert.push({
        topicId: targetTopic.id,
        text: q.text.trim(),
        type: inferQuestionType(q),
        choices: JSON.stringify(q.choices),
        correctAnswer: q.answer,
        explanation: q.explanation || null,
      });
    }

    if (toInsert.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        await db.insert(questions).values(toInsert.slice(i, i + chunkSize)).run();
      }
      importedCount = toInsert.length;
    }

    return res.json({
      success: true,
      data: {
        imported: importedCount,
        duplicates: duplicateCount,
        errors,
        topicCreated,
        topicName: targetTopic.name,
        subjectName: targetSubject.name,
        examTypeName: targetExamType.name,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error while processing question bank' });
  }
});

// Download sample template format
questionsRouter.get('/sample', (_req, res) => {
  const sampleData: QuestionBankUpload = {
    examType: 'ECT',
    subject: 'ELECTRONICS',
    topic: 'Semiconductors and Diodes',
    questions: [
      {
        text: 'What is the approximate forward barrier potential of a silicon diode at room temperature?',
        type: 'conceptual',
        choices: ['0.3 V', '0.7 V', '1.2 V', '5.0 V'],
        answer: 1,
        explanation: 'Silicon PN junctions typically exhibit a forward voltage barrier potential of approximately 0.7 V (compared to 0.3 V for Germanium).',
      },
      {
        text: 'Calculate the total equivalent resistance of three 60 $\\Omega$ resistors connected in parallel.',
        type: 'computation',
        choices: ['20 $\\Omega$', '60 $\\Omega$', '180 $\\Omega$', '30 $\\Omega$'],
        answer: 0,
        explanation: 'For $n$ identical parallel resistors: $R_{eq} = \\frac{R}{n} = \\frac{60}{3} = 20\\,\\Omega$.',
      },
    ],
  };

  return res.json({ success: true, data: sampleData });
});

// List questions by topic
questionsRouter.get('/list', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const topicId = parseInt(req.query.topicId as string, 10);
    if (!topicId || isNaN(topicId)) {
      return res.status(400).json({ success: false, error: 'Valid topicId query parameter required' });
    }

    const db = getDb();
    const qList = await db.select().from(questions).where(eq(questions.topicId, topicId)).all();

    const formatted = qList.map(q => ({
      id: q.id,
      topicId: q.topicId,
      text: q.text,
      type: q.type,
      choices: JSON.parse(q.choices) as string[],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      createdAt: q.createdAt,
    }));

    return res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('List questions error:', error);
    return res.status(500).json({ success: false, error: 'Failed to list questions' });
  }
});

// Delete a question (Admin / John only)
questionsRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.username !== 'john') {
      return res.status(403).json({ success: false, error: 'Access denied. Only John can delete questions.' });
    }

    const questionId = parseInt(req.params.id, 10);
    if (!questionId || isNaN(questionId)) {
      return res.status(400).json({ success: false, error: 'Invalid question ID' });
    }

    const db = getDb();

    // 1. Delete associated answers first
    await db.delete(quizAnswers).where(eq(quizAnswers.questionId, questionId)).run();

    // 2. Delete question
    const result = await db.delete(questions).where(eq(questions.id, questionId)).run();

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    return res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete question' });
  }
});

// Delete an entire topic and its questions (Admin / John only)
questionsRouter.delete('/topic/:topicId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.username !== 'john') {
      return res.status(403).json({ success: false, error: 'Access denied. Only John can delete topics.' });
    }

    const topicId = parseInt(req.params.topicId, 10);
    if (!topicId || isNaN(topicId)) {
      return res.status(400).json({ success: false, error: 'Invalid topic ID' });
    }

    const db = getDb();

    // 1. Find all question IDs for this topic
    const topicQuestions = await db.select({ id: questions.id }).from(questions).where(eq(questions.topicId, topicId)).all();
    const qIds = topicQuestions.map(q => q.id);

    if (qIds.length > 0) {
      // Delete answers
      await db.delete(quizAnswers).where(inArray(quizAnswers.questionId, qIds)).run();
      // Delete questions
      await db.delete(questions).where(eq(questions.topicId, topicId)).run();
    }

    // Unlink any quiz sessions referencing this topic to prevent foreign key errors
    await db.update(quizSessions).set({ topicId: null }).where(eq(quizSessions.topicId, topicId)).run();

    // Delete topic
    await db.delete(topics).where(eq(topics.id, topicId)).run();

    return res.json({ success: true, message: `Topic and ${qIds.length} question(s) deleted successfully` });
  } catch (error) {
    console.error('Delete topic error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete topic' });
  }
});
