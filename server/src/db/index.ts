import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import path from 'path';
import fs from 'fs';
import * as schema from './schema.js';

let db: LibSQLDatabase<typeof schema>;
let client: Client;

export function initDb() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl) {
    console.log(`Connecting to Turso Cloud Database: ${tursoUrl}`);
    client = createClient({
      url: tursoUrl,
      authToken: tursoAuthToken,
    });
  } else {
    // Local SQLite fallback using libSQL file URL
    const localDbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'reviewsite.db');
    const dir = path.dirname(localDbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const fileUrl = `file:${localDbPath.replace(/\\/g, '/')}`;
    console.log(`Connecting to Local Database: ${fileUrl}`);
    client = createClient({
      url: fileUrl,
    });
  }

  db = drizzle(client, { schema });
  return db;
}

export function getDb(): LibSQLDatabase<typeof schema> {
  if (!db) {
    return initDb();
  }
  return db;
}

export function getClient(): Client {
  if (!client) {
    initDb();
  }
  return client;
}
