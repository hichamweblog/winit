import { defineConfig } from 'drizzle-kit';

/**
 * The URL is resolved the same way as src/db/index.ts so `drizzle-kit` and the
 * app can never point at different files. `strict: true` makes destructive
 * schema changes require an explicit confirmation instead of silently applying.
 */
const url = process.env.DATABASE_URL?.replace(/^file:/, '') ?? './data/winit.db';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
