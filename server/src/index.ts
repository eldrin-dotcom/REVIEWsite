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

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'reviewsite-secret-key-change-in-production-2026';

// Proxy trust for secure cookies behind reverse proxies (Render, Fly.io, Railway, Nginx, Caddy)
app.set('trust proxy', 1);

// Warn if using default cookie secret in production
if (process.env.NODE_ENV === 'production' && COOKIE_SECRET === 'reviewsite-secret-key-change-in-production-2026') {
  console.warn('\x1b[33m%s\x1b[0m', '⚠️  WARNING: Using default COOKIE_SECRET in production! Please set COOKIE_SECRET in your environment variables.');
}

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

// Serve client whenever client/dist exists or in production
const clientDist = path.join(__dirname, '../../client/dist');
if (process.env.NODE_ENV === 'production' || fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

async function start() {
  try {
    initDb();
    // Auto-seed default tables and accounts on startup if database is fresh
    await runSeed();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
