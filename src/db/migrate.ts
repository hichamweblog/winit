/**
 * Applies committed migrations. Safe to run on every deploy: drizzle keeps a
 * journal table and only runs what has not been applied yet.
 *
 * Unlike `drizzle-kit push`, this never diffs a live database and never drops
 * anything implicitly.
 */
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db, sqlite } from './index';

const main = () => {
  const started = Date.now();
  migrate(db, { migrationsFolder: './drizzle' });
  console.log(`Migrations applied in ${Date.now() - started}ms`);
  sqlite.close();
};

try {
  main();
} catch (cause) {
  console.error('Migration failed:', cause);
  process.exit(1);
}
