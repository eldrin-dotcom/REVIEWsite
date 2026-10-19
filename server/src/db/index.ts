import Database, { type Database as BetterSqliteDatabase } from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import fs from 'fs';
import * as schema from './schema.js';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'reviewsite.db');

let db: BetterSQLite3Database<typeof schema>;
let sqlite: BetterSqliteDatabase;

export function initDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  sqlite = new Database(DB_PATH);

  // Enable WAL mode for high performance concurrent reads
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  db = drizzle(sqlite, { schema });

  console.log(`Database connected: ${DB_PATH}`);
  return db;
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!db) {
    return initDb();
  }
  return db;
}

export function getSqlite(): BetterSqliteDatabase {
  if (!sqlite) {
    initDb();
  }
  return sqlite;
}
