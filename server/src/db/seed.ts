import bcrypt from 'bcrypt';
import { initDb, getDb, getClient } from './index.js';
import { users, examTypes, subjects, appSettings } from './schema.js';
import { eq } from 'drizzle-orm';

const SALT_ROUNDS = 12;

export async function runSeed() {
  console.log('Seeding database...');
  initDb();
  const db = getDb();
  const client = getClient();

  // Create tables if they don't exist
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      theme TEXT NOT NULL DEFAULT 'light',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exam_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_type_id INTEGER NOT NULL REFERENCES exam_types(id),
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL REFERENCES subjects(id),
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL REFERENCES topics(id),
      text TEXT NOT NULL,
      type TEXT NOT NULL,
      choices TEXT NOT NULL,
      correct_answer INTEGER NOT NULL,
      explanation TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quiz_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      mode TEXT NOT NULL,
      exam_type_id INTEGER REFERENCES exam_types(id),
      subject_id INTEGER REFERENCES subjects(id),
      topic_id INTEGER REFERENCES topics(id),
      question_type_filter TEXT,
      total_questions INTEGER NOT NULL,
      correct_answers INTEGER NOT NULL DEFAULT 0,
      time_limit_seconds INTEGER,
      time_spent_seconds INTEGER,
      completed INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS quiz_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES quiz_sessions(id),
      question_id INTEGER NOT NULL REFERENCES questions(id),
      selected_answer INTEGER,
      is_correct INTEGER,
      answered_at TEXT
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookmarked_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      question_id INTEGER NOT NULL REFERENCES questions(id),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id, type);
    CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user ON quiz_sessions(user_id, completed);
    CREATE INDEX IF NOT EXISTS idx_quiz_answers_session ON quiz_answers(session_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_answers_question ON quiz_answers(question_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarked_user ON bookmarked_questions(user_id, question_id);
  `);

  // Seed default users if none exist
  const existingUsers = await db.select().from(users).all();
  if (existingUsers.length === 0) {
    const passwordHash = await bcrypt.hash('changeme123', SALT_ROUNDS);
    await db.insert(users).values([
      { username: 'john', passwordHash, displayName: 'John', theme: 'dark' },
      { username: 'emma', passwordHash, displayName: 'Hon', theme: 'pink' },
    ]).run();
    console.log('  ✓ Users seeded: john, emma (displayName: Hon, default password: changeme123)');
  } else {
    console.log('  - Users already present, skipping user seed');
  }

  // Seed exam types if none exist
  const existingExamTypes = await db.select().from(examTypes).all();
  if (existingExamTypes.length === 0) {
    await db.insert(examTypes).values([
      { name: 'Pre-board', description: 'Pre-board Examination (MATH, GEAS, ELECTRONICS, ESAT)' },
      { name: 'ECT', description: 'Electronics Technician Licensure Examination (Basic Math, ELECTRONICS, ESAT, ECE Laws)' },
    ]).run();
    console.log('  ✓ Exam types seeded: Pre-board, ECT');
  } else {
    console.log('  - Exam types already present, skipping exam type seed');
  }

  // Fetch exam types for subject mapping
  const preBoard = await db.select().from(examTypes).where(eq(examTypes.name, 'Pre-board')).get();
  const ect = await db.select().from(examTypes).where(eq(examTypes.name, 'ECT')).get();

  if (preBoard && ect) {
    const existingSubjects = await db.select().from(subjects).all();
    if (existingSubjects.length === 0) {
      await db.insert(subjects).values([
        // Pre-board subjects
        { examTypeId: preBoard.id, name: 'MATH' },
        { examTypeId: preBoard.id, name: 'GEAS' },
        { examTypeId: preBoard.id, name: 'ELECTRONICS' },
        { examTypeId: preBoard.id, name: 'ESAT' },
        // ECT subjects
        { examTypeId: ect.id, name: 'Basic Math' },
        { examTypeId: ect.id, name: 'ELECTRONICS' },
        { examTypeId: ect.id, name: 'ESAT' },
        { examTypeId: ect.id, name: 'ECE Laws' },
      ]).run();
      console.log('  ✓ Subjects seeded for Pre-board and ECT');
    } else {
      console.log('  - Subjects already present, skipping subject seed');
    }
  }

  // Seed default app settings if none exist
  const existingSettings = await db.select().from(appSettings).all();
  if (existingSettings.length === 0) {
    await db.insert(appSettings).values([
      { key: 'exam_target_date', value: '2026-10-25T08:00:00' },
      { key: 'exam_title', value: 'Electronics Technician (ECT) Licensure Examination' },
      { key: 'dino_pet_name', value: 'Rexy' },
    ]).run();
    console.log('  ✓ Default app settings seeded (Exam countdown target date & Dino pet name)');
  }

  console.log('Seeding completed successfully!');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
