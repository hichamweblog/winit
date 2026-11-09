/** Removes expired sessions. Wire this to a daily cron in production. */
import { lt } from 'drizzle-orm';
import { db, client } from './index';
import { sessions } from './schema';

const main = async () => {
  const removed = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .returning({ id: sessions.id });
  console.log(`Purged ${removed.length} expired session(s).`);
  await client.end();
};

main().catch((err) => {
  console.error('Failed to purge sessions:', err);
  process.exit(1);
});
