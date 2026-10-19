import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { questionsRouter } from './routes/questions.js';
import { quizRouter } from './routes/quiz.js';
import { progressRouter } from './routes/progress.js';
import { initDb } from './db/index.js';
import { runSeed } from './db/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'reviewsite-secret-key-change-in-production-2026';

// Proxy trust for secure cookies behind reverse proxies & Vercel
app.set('trust proxy', 1);

// Middleware
app.use(express.json({ limit: '20mb' }));
app.use(cookieParser(COOKIE_SECRET));

// CORS for Vite dev server (port 5173)
if (process.env.NODE_ENV !== 'production') {
  app.use(
    cors({
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  );
}

// Lazy / cached database initialization (essential for Serverless / Vercel cold starts)
let initPromise: Promise<void> | null = null;
export async function ensureDbInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      initDb();
      await runSeed();
    })();
  }
  return initPromise;
}

// Ensure database is connected before handling any API request
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/health') {
    try {
      await ensureDbInitialized();
    } catch (err) {
      console.error('Failed to initialize database for request:', err);
      return res.status(500).json({ success: false, error: 'Database connection failed' });
    }
  }
  next();
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/progress', progressRouter);

// Unmatched API routes return 404 JSON instead of hanging or returning HTML
app.all('/api/*', (_req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});

// Serve client if dist directory exists (for traditional node servers / local preview)
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

export default app;
