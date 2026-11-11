import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { focusSessions } from '@/db/schema';
import { ApiError, json, readJson, withApi } from '@/lib/server/http';
import { requireIdentity } from '@/lib/server/auth';
import { focusFinishInput } from '@/lib/server/dto';
import { guardMutation, stamp } from '@/lib/server/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi<{ id: string }>('focus.finish', async (request: NextRequest, { params }) => {
  const { id: sessionId } = await params;
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;
  const uid = identity.userId;

  const input = await readJson(request, focusFinishInput);
  const [existing] = await db
    .select()
    .from(focusSessions)
    .where(and(eq(focusSessions.id, sessionId), eq(focusSessions.workspaceId, ws)));

  if (!existing || existing.isCompleted) {
    throw new ApiError(404, 'جلسة التركيز غير موجودة أو منتهية', 'not_found');
  }
  if (existing.userId !== uid) {
    throw new ApiError(403, 'غير مصرح بإنهاء هذه الجلسة', 'forbidden');
  }

  // Never trust a client-reported duration beyond the wall-clock elapsed time
  // (plus a small grace for clock skew and a paused tab).
  const elapsed = Math.max(0, Math.floor((Date.now() - existing.startedAt.getTime()) / 1000)) + 5;
  const actualSeconds = Math.min(input.actualSeconds, elapsed, 4 * 3600);

  const [session] = await db
    .update(focusSessions)
    .set({
      actualSeconds,
      endedAt: stamp(),
      isCompleted: input.completed,
      note: input.note ?? null,
    })
    .where(
      and(
        eq(focusSessions.id, sessionId),
        eq(focusSessions.workspaceId, ws),
        eq(focusSessions.userId, uid),
        eq(focusSessions.isCompleted, false),
      ),
    )
    .returning();

  if (!session) {
    throw new ApiError(404, 'جلسة التركيز غير موجودة أو منتهية', 'not_found');
  }

  return json(session);
});
