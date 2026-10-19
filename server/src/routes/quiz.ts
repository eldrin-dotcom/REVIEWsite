import { Router, Response } from 'express';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { examTypes, subjects, topics, questions, quizSessions, quizAnswers } from '../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import type { StartQuizRequest, SubmitAnswerRequest, SubmitExamRequest } from 'shared';

export const quizRouter = Router();
quizRouter.use(requireAuth);

// Start a quiz session (Practice or Exam)
quizRouter.post('/start', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const body = req.body as StartQuizRequest;
    const { mode, examTypeId, subjectId, topicId, questionType, count, timeLimitSeconds } = body;

    if (!mode || (mode !== 'practice' && mode !== 'exam')) {
      return res.status(400).json({ success: false, error: 'Invalid quiz mode' });
    }

    const db = getDb();

    // Fetch pool of candidate questions
    let candidateQuestions: Array<typeof questions.$inferSelect> = [];

    if (mode === 'practice') {
      if (!topicId) {
        return res.status(400).json({ success: false, error: 'Topic is required for practice mode' });
      }

      let query = db.select().from(questions).where(eq(questions.topicId, topicId));
      let allForTopic = query.all();

      if (questionType && questionType !== 'mix') {
        allForTopic = allForTopic.filter(q => q.type === questionType);
      }

      candidateQuestions = allForTopic;
    } else {
      // Exam mode: mixed from all subjects under the exam type
      if (!examTypeId) {
        return res.status(400).json({ success: false, error: 'Exam type is required for exam mode' });
      }

      const examSubjects = db.select().from(subjects).where(eq(subjects.examTypeId, examTypeId)).all();
      const subjectIds = examSubjects.map(s => s.id);

      if (subjectIds.length > 0) {
        const examTopics = db.select().from(topics).where(inArray(topics.subjectId, subjectIds)).all();
        const topicIds = examTopics.map(t => t.id);

        if (topicIds.length > 0) {
          candidateQuestions = db.select().from(questions).where(inArray(questions.topicId, topicIds)).all();
        }
      }
    }

    if (candidateQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No questions available matching your selection. Please upload review materials first.',
      });
    }

    // Shuffle and pick desired count
    const shuffled = [...candidateQuestions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count || 20, shuffled.length));

    // Create session
    const session = db
      .insert(quizSessions)
      .values({
        userId,
        mode,
        examTypeId: examTypeId || null,
        subjectId: subjectId || null,
        topicId: topicId || null,
        questionTypeFilter: questionType || 'mix',
        totalQuestions: selected.length,
        correctAnswers: 0,
        timeLimitSeconds: mode === 'exam' ? (timeLimitSeconds || 3600) : null,
        completed: false,
      })
      .returning()
      .get();

    // Map questions to client format (remove correct answer & explanation)
    const clientQuestions = selected.map(q => ({
      id: q.id,
      text: q.text,
      type: q.type as 'conceptual' | 'computation',
      choices: JSON.parse(q.choices) as string[],
    }));

    return res.json({
      success: true,
      data: {
        session,
        questions: clientQuestions,
        serverStartTime: session.startedAt,
      },
    });
  } catch (error) {
    console.error('Start quiz error:', error);
    return res.status(500).json({ success: false, error: 'Failed to start quiz session' });
  }
});

// Submit a single answer in Practice Mode
quizRouter.post('/:sessionId/answer', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const sessionId = parseInt(req.params.sessionId, 10);
    const { questionId, selectedAnswer } = req.body as SubmitAnswerRequest;

    const db = getDb();

    // Verify session
    const session = db.select().from(quizSessions).where(
      and(
        eq(quizSessions.id, sessionId),
        eq(quizSessions.userId, userId)
      )
    ).get();

    if (!session) {
      return res.status(404).json({ success: false, error: 'Quiz session not found' });
    }

    const question = db.select().from(questions).where(eq(questions.id, questionId)).get();
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    const isCorrect = question.correctAnswer === selectedAnswer;

    // Record answer
    db.insert(quizAnswers).values({
      sessionId,
      questionId,
      selectedAnswer,
      isCorrect,
      answeredAt: new Date().toISOString(),
    }).run();

    // Increment session score if correct
    if (isCorrect) {
      db.update(quizSessions)
        .set({ correctAnswers: sql`${quizSessions.correctAnswers} + 1` })
        .where(eq(quizSessions.id, sessionId))
        .run();
    }

    return res.json({
      success: true,
      data: {
        correct: isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      },
    });
  } catch (error) {
    console.error('Answer submission error:', error);
    return res.status(500).json({ success: false, error: 'Failed to record answer' });
  }
});

// Submit entire exam or complete practice session
quizRouter.post('/:sessionId/submit', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const sessionId = parseInt(req.params.sessionId, 10);
    const { answers } = req.body as SubmitExamRequest;

    const db = getDb();

    const session = db.select().from(quizSessions).where(
      and(
        eq(quizSessions.id, sessionId),
        eq(quizSessions.userId, userId)
      )
    ).get();

    if (!session) {
      return res.status(404).json({ success: false, error: 'Quiz session not found' });
    }

    if (session.completed) {
      return res.status(400).json({ success: false, error: 'Session is already submitted' });
    }

    let correctCount = 0;

    // If answers provided (exam mode batch submit)
    if (Array.isArray(answers) && answers.length > 0) {
      const qIds = answers.map(a => a.questionId);
      const questionRecords = db.select().from(questions).where(inArray(questions.id, qIds)).all();
      const qMap = new Map(questionRecords.map(q => [q.id, q]));

      for (const ans of answers) {
        const q = qMap.get(ans.questionId);
        const isCorrect = q ? q.correctAnswer === ans.selectedAnswer : false;
        if (isCorrect) correctCount++;

        db.insert(quizAnswers).values({
          sessionId,
          questionId: ans.questionId,
          selectedAnswer: ans.selectedAnswer,
          isCorrect,
          answeredAt: new Date().toISOString(),
        }).run();
      }
    } else {
      // In practice mode, correctAnswers was already incremented incrementally
      const recorded = db.select().from(quizAnswers).where(eq(quizAnswers.sessionId, sessionId)).all();
      correctCount = recorded.filter(r => r.isCorrect).length;
    }

    // Calculate time spent
    const now = new Date();
    const startTime = new Date(session.startedAt);
    const timeSpentSeconds = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));

    // Update session as completed
    const updated = db.update(quizSessions).set({
      completed: true,
      correctAnswers: correctCount,
      timeSpentSeconds,
      completedAt: now.toISOString(),
    }).where(eq(quizSessions.id, sessionId)).returning().get();

    return res.json({
      success: true,
      data: {
        session: updated,
        score: correctCount,
        totalQuestions: session.totalQuestions,
        accuracy: session.totalQuestions > 0 ? Math.round((correctCount / session.totalQuestions) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('Quiz submit error:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit quiz session' });
  }
});

// Full Review of a Quiz Session
quizRouter.get('/:sessionId/review', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const sessionId = parseInt(req.params.sessionId, 10);

    const db = getDb();

    const session = db.select().from(quizSessions).where(
      and(
        eq(quizSessions.id, sessionId),
        eq(quizSessions.userId, userId)
      )
    ).get();

    if (!session) {
      return res.status(404).json({ success: false, error: 'Quiz session not found' });
    }

    const answers = db.select().from(quizAnswers).where(eq(quizAnswers.sessionId, sessionId)).all();
    const qIds = answers.map(a => a.questionId);

    const questionList = qIds.length > 0
      ? db.select().from(questions).where(inArray(questions.id, qIds)).all()
      : [];
    const qMap = new Map(questionList.map(q => [q.id, q]));

    const items = answers
      .map(a => {
        const q = qMap.get(a.questionId);
        if (!q) return null;
        return {
          question: {
            id: q.id,
            topicId: q.topicId,
            text: q.text,
            type: q.type as 'conceptual' | 'computation',
            choices: JSON.parse(q.choices) as string[],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || undefined,
          },
          selectedAnswer: a.selectedAnswer,
          isCorrect: Boolean(a.isCorrect),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return res.json({
      success: true,
      data: {
        session,
        items,
      },
    });
  } catch (error) {
    console.error('Quiz review error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve quiz review' });
  }
});
