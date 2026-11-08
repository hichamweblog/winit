import { sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { db } from '@/db';
import { json, withApi } from '@/lib/server/http';
import { demoModeEnabled } from '@/lib/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness + readiness. Deliberately leaks no version, path or configuration
 * detail beyond a single warning flag an operator needs to see.
 */
export const GET = withApi('health', async (_request: NextRequest) => {
  const started = Date.now();
  try {
    db.get(sql`SELECT 1`);
    return json({
      status: 'ok',
      database: 'up',
      latencyMs: Date.now() - started,
      // Loud, machine-readable warning: a real deployment must not set this.
      demoMode: demoModeEnabled(),
    });
  } catch {
    return json({ status: 'degraded', database: 'down' }, 503);
  }
});
