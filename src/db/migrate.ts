/**
 * Applies committed migrations. Safe to run on every deploy: drizzle keeps a
 * journal table and only runs what has not been applied yet.
 */
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, client } from './index';

const main = async () => {
  const started = Date.now();
  console.log('Applying database migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log(`Migrations applied in ${Date.now() - started}ms`);
  await client.end();
};

main().catch((cause) => {
  console.error('Migration failed:', cause);
  process.exit(1);
});
