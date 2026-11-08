/** Removes expired sessions. Wire this to a daily cron in production. */
import { lt } from 'drizzle-orm';
import { db, sqlite } from './index';
import { sessions } from './schema';

const removed = db.delete(sessions).where(lt(sessions.expiresAt, new Date())).returning({ id: sessions.id }).all();
console.log(`Purged ${removed.length} expired session(s).`);
sqlite.close();
