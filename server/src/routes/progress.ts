import { Router, Response } from 'express';
import { eq, desc, sql, inArray } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { examTypes, subjects, topics, questions, quizSessions, quizAnswers } from '../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

export const progressRouter = Router();
progressRouter.use(requireAuth);

// Overall stats
progressRouter.get('/overview', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const db = getDb();

    const userSessions = db
      .select()
      .from(quizSessions)
      .where(eq(quizSessions.userId, userId))
      .all();

    const completedSessions = userSessions.filter(s => s.completed);

    let totalQuestions = 0;
    let totalCorrect = 0;

    for (const s of completedSessions) {
      totalQuestions += s.totalQuestions;
      totalCorrect += s.correctAnswers;
    }

    const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const practiceSessions = completedSessions.filter(s => s.mode === 'practice').length;
    const examSessions = completedSessions.filter(s => s.mode === 'exam').length;

    return res.json({
      success: true,
      data: {
        totalQuestionsAnswered: totalQuestions,
        totalCorrect,
        overallAccuracy,
        totalSessions: completedSessions.length,
        practiceSessions,
        examSessions,
      },
    });
  } catch (error) {
    console.error('Progress overview error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch progress overview' });
  }
});

// Subject competency breakdown for radar chart
progressRouter.get('/subjects', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const db = getDb();

    // Find all answers by this user
    const userSessionIds = db
      .select({ id: quizSessions.id })
      .from(quizSessions)
      .where(eq(quizSessions.userId, userId))
      .all()
      .map(s => s.id);

    if (userSessionIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Join answers with question -> topic -> subject
    const userAnswers = db
      .select({
        isCorrect: quizAnswers.isCorrect,
        questionId: quizAnswers.questionId,
      })
      .from(quizAnswers)
      .where(inArray(quizAnswers.sessionId, userSessionIds))
      .all();

    if (userAnswers.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const qIds = [...new Set(userAnswers.map(a => a.questionId))];
    const qRecords = db
      .select({
        id: questions.id,
        topicId: questions.topicId,
      })
      .from(questions)
      .where(inArray(questions.id, qIds))
      .all();
    const qTopicMap = new Map(qRecords.map(q => [q.id, q.topicId]));

    const topicIds = [...new Set(qRecords.map(q => q.topicId))];
    const topicRecords = db
      .select({
        id: topics.id,
        name: topics.name,
        subjectId: topics.subjectId,
      })
      .from(topics)
      .where(inArray(topics.id, topicIds))
      .all();
    const topicSubjectMap = new Map(topicRecords.map(t => [t.id, t.subjectId]));

    const allSubjects = db.select().from(subjects).all();
    const subjectMap = new Map(allSubjects.map(s => [s.id, s]));

    // Aggregate by subject
    const subjectStats = new Map<number, { name: string; total: number; correct: number }>();

    for (const ans of userAnswers) {
      const topId = qTopicMap.get(ans.questionId);
      if (!topId) continue;
      const subId = topicSubjectMap.get(topId);
      if (!subId) continue;

      const subObj = subjectMap.get(subId);
      if (!subObj) continue;

      if (!subjectStats.has(subId)) {
        subjectStats.set(subId, { name: subObj.name, total: 0, correct: 0 });
      }

      const st = subjectStats.get(subId)!;
      st.total++;
      if (ans.isCorrect) st.correct++;
    }

    const breakdown = Array.from(subjectStats.entries()).map(([subjectId, val]) => ({
      subjectId,
      subjectName: val.name,
      totalAnswered: val.total,
      correctAnswers: val.correct,
      accuracy: Math.round((val.correct / val.total) * 100),
    }));

    return res.json({ success: true, data: breakdown });
  } catch (error) {
    console.error('Subject progress error:', error);
    return res.status(500).json({ success: false, error: 'Failed to calculate subject progress' });
  }
});

// Score history over time for trend line chart
progressRouter.get('/history', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const db = getDb();

    const completed = db
      .select({
        id: quizSessions.id,
        mode: quizSessions.mode,
        examTypeId: quizSessions.examTypeId,
        correctAnswers: quizSessions.correctAnswers,
        totalQuestions: quizSessions.totalQuestions,
        completedAt: quizSessions.completedAt,
        startedAt: quizSessions.startedAt,
      })
      .from(quizSessions)
      .where(eq(quizSessions.userId, userId))
      .orderBy(quizSessions.completedAt)
      .all()
      .filter(s => s.completedAt);

    const allExamTypes = db.select().from(examTypes).all();
    const etMap = new Map(allExamTypes.map(e => [e.id, e.name]));

    const history = completed.map(s => ({
      id: s.id,
      date: s.completedAt ? new Date(s.completedAt).toLocaleDateString() : 'N/A',
      mode: s.mode,
      examType: s.examTypeId ? (etMap.get(s.examTypeId) || 'Review') : 'Review',
      score: s.correctAnswers,
      totalQuestions: s.totalQuestions,
      accuracy: Math.round((s.correctAnswers / s.totalQuestions) * 100),
    }));

    return res.json({ success: true, data: history });
  } catch (error) {
    console.error('Progress history error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch progress history' });
  }
});

// Recent sessions
progressRouter.get('/sessions', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const db = getDb();

    const recent = db
      .select()
      .from(quizSessions)
      .where(eq(quizSessions.userId, userId))
      .orderBy(desc(quizSessions.startedAt))
      .limit(10)
      .all();

    const allExamTypes = db.select().from(examTypes).all();
    const etMap = new Map(allExamTypes.map(e => [e.id, e.name]));

    const allSubjects = db.select().from(subjects).all();
    const subMap = new Map(allSubjects.map(s => [s.id, s.name]));

    const allTopics = db.select().from(topics).all();
    const topMap = new Map(allTopics.map(t => [t.id, t.name]));

    const formatted = recent.map(s => ({
      id: s.id,
      mode: s.mode,
      examTypeName: s.examTypeId ? (etMap.get(s.examTypeId) || 'General') : 'General',
      subjectName: s.subjectId ? subMap.get(s.subjectId) : undefined,
      topicName: s.topicId ? topMap.get(s.topicId) : undefined,
      score: s.correctAnswers,
      totalQuestions: s.totalQuestions,
      accuracy: s.totalQuestions > 0 ? Math.round((s.correctAnswers / s.totalQuestions) * 100) : 0,
      timeSpentSeconds: s.timeSpentSeconds || 0,
      completed: s.completed,
      completedAt: s.completedAt || s.startedAt,
    }));

    return res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Recent sessions error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch recent sessions' });
  }
});

// Reset progress for authenticated user
progressRouter.delete('/reset', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const db = getDb();

    // 1. Get all session IDs for this user
    const userSessionIds = db
      .select({ id: quizSessions.id })
      .from(quizSessions)
      .where(eq(quizSessions.userId, userId))
      .all()
      .map(s => s.id);

    // 2. Delete quiz answers for these sessions
    if (userSessionIds.length > 0) {
      db.delete(quizAnswers).where(inArray(quizAnswers.sessionId, userSessionIds)).run();
    }

    // 3. Delete quiz sessions for this user
    db.delete(quizSessions).where(eq(quizSessions.userId, userId)).run();

    return res.json({
      success: true,
      message: 'All your progress, session history, and scores have been reset successfully.',
    });
  } catch (error) {
    console.error('Reset progress error:', error);
    return res.status(500).json({ success: false, error: 'Failed to reset progress' });
  }
});

