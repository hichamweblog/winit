import { NextRequest } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { focusSessions } from '@/db/schema';
import { enforceRateLimit, json, withApi } from '@/lib/server/http';
import { requireIdentity } from '@/lib/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withApi('focus.list', async (request: NextRequest) => {
  const identity = await requireIdentity(request);
  const ws = identity.workspaceId;
  enforceRateLimit(request, 'read', 600, 60 * 1000);

  const rows = await db
    .select()
    .from(focusSessions)
    .where(eq(focusSessions.workspaceId, ws))
    .orderBy(desc(focusSessions.startedAt))
    .limit(50);

  return json(rows);
});
