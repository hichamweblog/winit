import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/winit';

// In serverless environments (Vercel / Next.js API routes), preserve client across hot reloads in dev
const globalForDb = globalThis as unknown as { client?: postgres.Sql };

export const client =
  globalForDb.client ??
  postgres(connectionString, {
    // prepare: false is required for Supabase / PgBouncer / Supavisor transaction pooler (port 6543)
    prepare: false,
    max: process.env.NODE_ENV === 'production' ? 2 : 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== 'production') globalForDb.client = client;

export const db = drizzle(client, { schema });
export const DEMO_USER_ID = 'user_personal';
export const DEMO_WORKSPACE_ID = 'workspace_personal';
