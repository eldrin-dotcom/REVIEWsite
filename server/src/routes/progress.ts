import { Router, Response } from 'express';
import { eq, desc, inArray, and, sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { examTypes, subjects, topics, questions, quizSessions, quizAnswers, users, appSettings } from '../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

export const progressRouter = Router();
progressRouter.use(requireAuth);

// Overall stats
progressRouter.get('/overview', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const db = getDb();

    const userSessions = await db
      .select()
      .from(quizSessions)
      .where(eq(quizSessions.userId, userId))
      .all();

    const completedSessions = userSessions.filter(s => s.completed);

    // Count all answers logged by this user across all sessions
    const userAnswers = await db
      .select({
        id: quizAnswers.id,
        isCorrect: quizAnswers.isCorrect,
      })
      .from(quizAnswers)
      .innerJoin(quizSessions, eq(quizAnswers.sessionId, quizSessions.id))
      .where(
        and(
          eq(quizSessions.userId, userId),
          sql`${quizAnswers.selectedAnswer} IS NOT NULL`
        )
      )
      .all();

    const totalQuestions = userAnswers.length;
    const totalCorrect = userAnswers.filter(a => a.isCorrect).length;
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
progressRouter.get('/subjects', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const db = getDb();

    // Find all answers by this user
    const userSessionRows = await db
      .select({ id: quizSessions.id })
      .from(quizSessions)
      .where(eq(quizSessions.userId, userId))
      .all();
    const userSessionIds = userSessionRows.map(s => s.id);

    if (userSessionIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Join answers with question -> topic -> subject
    const userAnswers = await db
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
    const qRecords = await db
      .select({
        id: questions.id,
        topicId: questions.topicId,
      })
      .from(questions)
      .where(inArray(questions.id, qIds))
      .all();
    const qTopicMap = new Map(qRecords.map(q => [q.id, q.topicId]));

    const topicIds = [...new Set(qRecords.map(q => q.topicId))];
    const topicRecords = await db
      .select({
        id: topics.id,
        name: topics.name,
        subjectId: topics.subjectId,
      })
      .from(topics)
      .where(inArray(topics.id, topicIds))
      .all();
    const topicSubjectMap = new Map(topicRecords.map(t => [t.id, t.subjectId]));

    const allSubjects = await db.select().from(subjects).all();
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
progressRouter.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const db = getDb();

    const allSessions = await db
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
      .all();

    const completed = allSessions.filter(s => s.completedAt);

    const allExamTypes = await db.select().from(examTypes).all();
    const etMap = new Map(allExamTypes.map(e => [e.id, e.name]));

    const history = completed.map(s => ({
      id: s.id,
      date: s.completedAt ? new Date(s.completedAt).toLocaleDateString() : 'N/A',
      mode: s.mode,
      examType: s.examTypeId ? (etMap.get(s.examTypeId) || 'Review') : 'Review',
      score: s.correctAnswers,
      totalQuestions: s.totalQuestions,
      accuracy: s.totalQuestions > 0 ? Math.round((s.correctAnswers / s.totalQuestions) * 100) : 0,
    }));

    return res.json({ success: true, data: history });
  } catch (error) {
    console.error('Progress history error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch progress history' });
  }
});

// Recent sessions
progressRouter.get('/sessions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const db = getDb();

    const recent = await db
      .select()
      .from(quizSessions)
      .where(eq(quizSessions.userId, userId))
      .orderBy(desc(quizSessions.startedAt))
      .limit(10)
      .all();

    const allExamTypes = await db.select().from(examTypes).all();
    const etMap = new Map(allExamTypes.map(e => [e.id, e.name]));

    const allSubjects = await db.select().from(subjects).all();
    const subMap = new Map(allSubjects.map(s => [s.id, s.name]));

    const allTopics = await db.select().from(topics).all();
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
progressRouter.delete('/reset', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const db = getDb();

    // 1. Get all session IDs for this user
    const userSessionRows = await db
      .select({ id: quizSessions.id })
      .from(quizSessions)
      .where(eq(quizSessions.userId, userId))
      .all();
    const userSessionIds = userSessionRows.map(s => s.id);

    // 2. Delete quiz answers for these sessions
    if (userSessionIds.length > 0) {
      await db.delete(quizAnswers).where(inArray(quizAnswers.sessionId, userSessionIds)).run();
    }

    // 3. Delete quiz sessions for this user
    await db.delete(quizSessions).where(eq(quizSessions.userId, userId)).run();

    return res.json({
      success: true,
      message: 'All your progress, session history, and scores have been reset successfully.',
    });
  } catch (error) {
    console.error('Reset progress error:', error);
    return res.status(500).json({ success: false, error: 'Failed to reset progress' });
  }
});

// Reliable Philippine/UTC+8 date formatter (YYYY-MM-DD)
const manilaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function getManilaDateStr(daysAgo = 0): string {
  const d = new Date();
  if (daysAgo !== 0) {
    d.setDate(d.getDate() - daysAgo);
  }
  return manilaDateFormatter.format(d);
}

// Duo Streak & Dino Pet endpoint
progressRouter.get('/duo-streak', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    const todayStr = getManilaDateStr(0);

    // 1. Fetch John & Hon user records
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
      })
      .from(users)
      .all();

    // 2. Fetch app settings (countdown & dino name)
    const settingsList = await db.select().from(appSettings).all();
    const settingsMap = new Map(settingsList.map((s) => [s.key, s.value]));

    const targetDate = settingsMap.get('exam_target_date') || '2026-10-25T08:00:00';
    const examTitle = settingsMap.get('exam_title') || 'Electronics Technician (ECT) Licensure Examination';
    const dinoName = settingsMap.get('dino_pet_name') || 'Rexy';

    // 3. Count daily answers per user across all dates
    // Converts UTC timestamps to local Philippine time (UTC+8) using SQLite date(ts, '+8 hours')
    const dailyGroupCounts = await db
      .select({
        userId: quizSessions.userId,
        dateStr: sql<string>`date(coalesce(${quizAnswers.answeredAt}, ${quizSessions.startedAt}), '+8 hours')`,
        count: sql<number>`count(*)`,
      })
      .from(quizAnswers)
      .innerJoin(quizSessions, eq(quizAnswers.sessionId, quizSessions.id))
      .where(sql`${quizAnswers.selectedAnswer} IS NOT NULL`)
      .groupBy(
        quizSessions.userId,
        sql`date(coalesce(${quizAnswers.answeredAt}, ${quizSessions.startedAt}), '+8 hours')`
      )
      .all();

    const countMap = new Map<string, number>();
    for (const row of dailyGroupCounts) {
      if (row.userId && row.dateStr) {
        countMap.set(`${row.userId}:${row.dateStr}`, Number(row.count) || 0);
      }
    }

    // Helper to calculate an individual user's consecutive day streak
    function getUserStreak(userId: number): number {
      const isUserDaySuccessful = (dateStr: string) => {
        const c = countMap.get(`${userId}:${dateStr}`) || 0;
        return c >= 10;
      };

      const userDoneToday = isUserDaySuccessful(todayStr);
      let streak = 0;

      if (userDoneToday) {
        streak++;
        for (let daysAgo = 1; daysAgo <= 365; daysAgo++) {
          const prevDate = getManilaDateStr(daysAgo);
          if (isUserDaySuccessful(prevDate)) {
            streak++;
          } else {
            break;
          }
        }
      } else {
        // Today not complete yet; count active streak through yesterday
        for (let daysAgo = 1; daysAgo <= 365; daysAgo++) {
          const prevDate = getManilaDateStr(daysAgo);
          if (isUserDaySuccessful(prevDate)) {
            streak++;
          } else {
            break;
          }
        }
      }

      return streak;
    }

    // 4. Calculate today's status for each user
    const usersProgress = allUsers.map((u) => {
      const answeredToday = countMap.get(`${u.id}:${todayStr}`) || 0;
      return {
        userId: u.id,
        username: u.username,
        displayName: u.displayName,
        answeredToday,
        targetToday: 10,
        completedToday: answeredToday >= 10,
        currentStreak: getUserStreak(u.id),
      };
    });

    const completedToday = usersProgress.length > 0 && usersProgress.every((u) => u.completedToday);

    // 5. Calculate consecutive Duo Streak (both users >= 10 questions on the same day)
    function isDuoDaySuccessful(dateStr: string): boolean {
      if (allUsers.length === 0) return false;
      return allUsers.every((u) => {
        const c = countMap.get(`${u.id}:${dateStr}`) || 0;
        return c >= 10;
      });
    }

    let currentStreak = 0;

    if (completedToday) {
      currentStreak++;
      // Walk backwards through previous days starting yesterday
      for (let daysAgo = 1; daysAgo <= 365; daysAgo++) {
        const prevDateStr = getManilaDateStr(daysAgo);
        if (isDuoDaySuccessful(prevDateStr)) {
          currentStreak++;
        } else {
          break;
        }
      }
    } else {
      // Walk backwards through previous days starting yesterday
      for (let daysAgo = 1; daysAgo <= 365; daysAgo++) {
        const prevDateStr = getManilaDateStr(daysAgo);
        if (isDuoDaySuccessful(prevDateStr)) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // If streak is active from yesterday but not completed yet today, it is at risk
    const yesterdayDateStr = getManilaDateStr(1);
    const yesterdaySuccessful = isDuoDaySuccessful(yesterdayDateStr);
    const atRisk = !completedToday && yesterdaySuccessful;

    // 6. Dino Pet Stage & Mood
    let stage: 'egg' | 'baby' | 'study' | 'tech' | 'top_notcher' = 'baby';
    let title = 'Baby Dino';
    if (currentStreak >= 30) {
      stage = 'top_notcher';
      title = 'Top Notcher Dino';
    } else if (currentStreak >= 14) {
      stage = 'tech';
      title = 'Engineer Dino';
    } else if (currentStreak >= 7) {
      stage = 'study';
      title = 'Study Dino';
    } else if (currentStreak >= 3) {
      stage = 'baby';
      title = 'Active Dino';
    } else {
      stage = 'egg';
      title = 'Baby Dino';
    }

    let mood: 'celebrating' | 'happy' | 'waiting' | 'sleepy' = 'sleepy';
    if (completedToday) {
      mood = 'celebrating';
    } else {
      const anyDone = usersProgress.some((u) => u.completedToday);
      if (anyDone) {
        mood = 'waiting';
      } else {
        mood = currentStreak > 0 ? 'waiting' : 'sleepy';
      }
    }

    return res.json({
      success: true,
      data: {
        currentStreak,
        completedToday,
        atRisk,
        todayDate: todayStr,
        users: usersProgress,
        dino: {
          name: dinoName,
          stage,
          level: Math.max(1, Math.min(5, Math.floor(currentStreak / 7) + 1)),
          mood,
          title,
        },
        examCountdown: {
          targetDate,
          title: examTitle,
        },
      },
    });
  } catch (error) {
    console.error('Duo streak error:', error);
    return res.status(500).json({ success: false, error: 'Failed to calculate duo streak' });
  }
});

// Update Exam Countdown Target Date & Title
progressRouter.put('/exam-countdown', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetDate, title } = req.body;
    if (!targetDate) {
      return res.status(400).json({ success: false, error: 'Target date is required' });
    }

    const db = getDb();

    // Upsert target date
    await db
      .insert(appSettings)
      .values({ key: 'exam_target_date', value: String(targetDate) })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: String(targetDate), updatedAt: sql`(datetime('now'))` },
      })
      .run();

    if (title && typeof title === 'string') {
      await db
        .insert(appSettings)
        .values({ key: 'exam_title', value: title.trim() })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: { value: title.trim(), updatedAt: sql`(datetime('now'))` },
        })
        .run();
    }

    return res.json({
      success: true,
      data: {
        targetDate,
        title: title || 'Electronics Technician (ECT) Licensure Examination',
      },
      message: 'Exam countdown target updated successfully',
    });
  } catch (error) {
    console.error('Update exam countdown error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update exam countdown' });
  }
});
