import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import fs from 'node:fs';
import path from 'node:path';

const file = process.env.DATABASE_URL?.replace(/^file:/, '') ?? path.join(process.cwd(), 'data', 'winit.db');
fs.mkdirSync(path.dirname(file), { recursive: true });

const globalForDb = globalThis as unknown as { sqlite?: Database.Database };
const sqlite = globalForDb.sqlite ?? new Database(file);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
if (process.env.NODE_ENV !== 'production') globalForDb.sqlite = sqlite;

export const db = drizzle(sqlite, { schema });
export { sqlite };
export const DEMO_USER_ID = 'user_personal';
export const DEMO_WORKSPACE_ID = 'workspace_personal';
