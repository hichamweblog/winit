import { sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { db } from '@/db';
import { json, withApi } from '@/lib/server/http';
import { demoModeEnabled, purgeExpiredSessions } from '@/lib/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness + readiness. Deliberately leaks no version, path or configuration
 * detail beyond a single warning flag an operator needs to see.
 * Also serves as the lightweight cron target for session purging when ?purge=1.
 */
export const GET = withApi('health', async (request: NextRequest) => {
  const started = Date.now();
  try {
    await db.execute(sql`SELECT 1`);

    let purgedSessions: number | undefined;
    if (request.nextUrl.searchParams.get('purge') === '1') {
      const authHeader = request.headers.get('authorization');
      if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return json({ status: 'unauthorized' }, 401);
      }
      purgedSessions = await purgeExpiredSessions();
    }

    return json({
      status: 'ok',
      database: 'up',
      latencyMs: Date.now() - started,
      // Loud, machine-readable warning: a real deployment must not set this.
      demoMode: demoModeEnabled(),
      ...(purgedSessions !== undefined ? { purgedSessions } : {}),
    });
  } catch {
    return json({ status: 'degraded', database: 'down' }, 503);
  }
});
