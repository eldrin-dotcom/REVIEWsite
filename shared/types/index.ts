// ============================================
// Auth Types
// ============================================

export interface User {
  id: number;
  username: string;
  displayName: string;
  theme: Theme;
}

export type Theme = 'light' | 'dark' | 'pink';

export interface LoginRequest {
  username: string;
  password?: string;
}

export interface LoginResponse {
  user: User;
  message: string;
}

// ============================================
// Question Types
// ============================================

export type QuestionType = 'conceptual' | 'computation';
export type QuestionTypeFilter = QuestionType | 'mix';

export interface Question {
  id: number;
  topicId: number;
  text: string;
  type: QuestionType;
  choices: string[];
  correctAnswer: number;
  explanation?: string;
}

/** Question as sent to client during quiz (no answer revealed) */
export interface QuizQuestion {
  id: number;
  text: string;
  type: QuestionType;
  choices: string[];
}

/** JSON upload schema — what the AI extraction produces */
export interface QuestionBankUpload {
  examType: string;
  subject: string;
  topic: string;
  questions: QuestionImport[];
}

export interface QuestionImport {
  text: string;
  type: QuestionType;
  choices: string[];
  answer: number;
  explanation?: string;
}

export interface UploadResult {
  success: boolean;
  imported: number;
  duplicates: number;
  errors: string[];
  topicCreated: boolean;
}

// ============================================
// Exam & Subject Types
// ============================================

export interface ExamType {
  id: number;
  name: string;
  description?: string;
}

export interface Subject {
  id: number;
  examTypeId: number;
  name: string;
}

export interface Topic {
  id: number;
  subjectId: number;
  name: string;
}

export interface SubjectWithTopics extends Subject {
  topics: TopicWithCount[];
}

export interface TopicWithCount extends Topic {
  questionCount: number;
  answeredCount?: number;
}

export interface ExamTypeWithSubjects extends ExamType {
  subjects: SubjectWithTopics[];
}

// ============================================
// Quiz Types
// ============================================

export type QuizMode = 'practice' | 'exam';

export interface StartQuizRequest {
  mode: QuizMode;
  examTypeId: number;
  subjectId?: number;       // Required for practice
  topicId?: number;         // Required for practice
  questionType: QuestionTypeFilter;
  count: number;
  timeLimitSeconds?: number; // Required for exam mode
  excludeAnswered?: boolean; // Exclude questions already answered by user
}

export interface QuizSession {
  id: number;
  userId: number;
  mode: QuizMode;
  examTypeId: number;
  subjectId?: number;
  topicId?: number;
  questionTypeFilter: QuestionTypeFilter;
  totalQuestions: number;
  correctAnswers: number;
  timeLimitSeconds?: number;
  timeSpentSeconds?: number;
  completed: boolean;
  startedAt: string;
  completedAt?: string;
}

export interface StartQuizResponse {
  session: QuizSession;
  questions: QuizQuestion[];
  serverStartTime: string;
}

export interface SubmitAnswerRequest {
  questionId: number;
  selectedAnswer: number;
}

export interface SubmitAnswerResponse {
  correct: boolean;
  correctAnswer: number;
  explanation?: string;
}

export interface SubmitExamRequest {
  answers: SubmitAnswerRequest[];
}

export interface QuizReviewItem {
  question: Question;
  selectedAnswer: number | null;
  isCorrect: boolean;
}

export interface QuizReview {
  session: QuizSession;
  items: QuizReviewItem[];
  subjectBreakdown?: SubjectScore[];
}

// ============================================
// Progress Types
// ============================================

export interface ProgressOverview {
  totalQuestionsAnswered: number;
  totalCorrect: number;
  overallAccuracy: number;
  totalSessions: number;
  practiceSessions: number;
  examSessions: number;
}

export interface SubjectScore {
  subjectId: number;
  subjectName: string;
  totalAnswered: number;
  correctAnswers: number;
  accuracy: number;
}

export interface TopicScore {
  topicId: number;
  topicName: string;
  totalAnswered: number;
  correctAnswers: number;
  accuracy: number;
}

export interface ProgressHistory {
  date: string;
  mode: QuizMode;
  examType: string;
  score: number;
  totalQuestions: number;
  accuracy: number;
}

export interface RecentSession {
  id: number;
  mode: QuizMode;
  examTypeName: string;
  subjectName?: string;
  topicName?: string;
  score: number;
  totalQuestions: number;
  accuracy: number;
  timeSpentSeconds?: number;
  completedAt: string;
}

// ============================================
// Duo Streak, Dino Pet & Countdown Types
// ============================================

export interface DuoUserProgress {
  userId: number;
  username: string;
  displayName: string;
  answeredToday: number;
  targetToday: number;
  completedToday: boolean;
  currentStreak?: number;
}

export type DinoStage = 'egg' | 'baby' | 'study' | 'tech' | 'top_notcher';
export type DinoMood = 'celebrating' | 'happy' | 'waiting' | 'sleepy';

export interface DinoPetInfo {
  name: string;
  stage: DinoStage;
  level: number;
  mood: DinoMood;
  title: string;
}

export interface ExamCountdownInfo {
  targetDate: string;
  title: string;
}

export interface DuoStreakData {
  currentStreak: number;
  completedToday: boolean;
  atRisk: boolean;
  todayDate: string;
  users: DuoUserProgress[];
  dino: DinoPetInfo;
  examCountdown: ExamCountdownInfo;
}

// ============================================
// API Response Wrapper
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
