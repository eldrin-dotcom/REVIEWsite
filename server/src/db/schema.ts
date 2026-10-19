import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  theme: text('theme').default('light').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const examTypes = sqliteTable('exam_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').unique().notNull(),
  description: text('description'),
});

export const subjects = sqliteTable('subjects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  examTypeId: integer('exam_type_id').notNull().references(() => examTypes.id),
  name: text('name').notNull(),
});

export const topics = sqliteTable('topics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  subjectId: integer('subject_id').notNull().references(() => subjects.id),
  name: text('name').notNull(),
});

export const questions = sqliteTable('questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  topicId: integer('topic_id').notNull().references(() => topics.id),
  text: text('text').notNull(),
  type: text('type').notNull(),
  choices: text('choices').notNull(), // JSON string array of choices
  correctAnswer: integer('correct_answer').notNull(),
  explanation: text('explanation'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const quizSessions = sqliteTable('quiz_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  mode: text('mode').notNull(), // 'practice' | 'exam'
  examTypeId: integer('exam_type_id').references(() => examTypes.id),
  subjectId: integer('subject_id').references(() => subjects.id),
  topicId: integer('topic_id').references(() => topics.id),
  questionTypeFilter: text('question_type_filter'), // 'conceptual' | 'computation' | 'mix'
  totalQuestions: integer('total_questions').notNull(),
  correctAnswers: integer('correct_answers').default(0).notNull(),
  timeLimitSeconds: integer('time_limit_seconds'),
  timeSpentSeconds: integer('time_spent_seconds'),
  completed: integer('completed', { mode: 'boolean' }).default(false).notNull(),
  startedAt: text('started_at').default(sql`(datetime('now'))`).notNull(),
  completedAt: text('completed_at'),
});

export const quizAnswers = sqliteTable('quiz_answers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').notNull().references(() => quizSessions.id),
  questionId: integer('question_id').notNull().references(() => questions.id),
  selectedAnswer: integer('selected_answer'),
  isCorrect: integer('is_correct', { mode: 'boolean' }),
  answeredAt: text('answered_at'),
});
