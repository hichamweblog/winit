import { NextRequest } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { focusSessions } from '@/db/schema';
import { ApiError, json, readJson, withApi } from '@/lib/server/http';
import { requireIdentity } from '@/lib/server/auth';
import { focusFinishInput } from '@/lib/server/dto';
import { guardMutation, stamp } from '@/lib/server/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const focusFinishRequest = focusFinishInput.extend({
  actualSeconds: z.number().int().min(0).max(2_147_483_647),
});

function focusActualSeconds(reportedSeconds: number, startedAt: Date, now = Date.now()) {
  const elapsed = Math.max(0, Math.floor((now - startedAt.getTime()) / 1000) + 5);
  return Math.min(reportedSeconds, elapsed);
}

export const POST = withApi<{ id: string }>('focus.finish', async (request: NextRequest, { params }) => {
  const { id: sessionId } = await params;
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;
  const uid = identity.userId;

  const input = await readJson(request, focusFinishRequest);
  const [existing] = await db
    .select()
    .from(focusSessions)
    .where(and(eq(focusSessions.id, sessionId), eq(focusSessions.workspaceId, ws)));

  if (!existing || existing.isCompleted || existing.endedAt) {
    throw new ApiError(404, 'جلسة التركيز غير موجودة أو منتهية', 'not_found');
  }
  if (existing.userId !== uid) {
    throw new ApiError(403, 'غير مصرح بإنهاء هذه الجلسة', 'forbidden');
  }

  const actualSeconds = focusActualSeconds(input.actualSeconds, existing.startedAt);

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
        isNull(focusSessions.endedAt),
      ),
    )
    .returning();

  if (!session) {
    throw new ApiError(404, 'جلسة التركيز غير موجودة أو منتهية', 'not_found');
  }

  return json(session);
});
