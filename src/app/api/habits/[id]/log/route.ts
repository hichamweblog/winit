import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { habitLogs, habits } from '@/db/schema';
import { json, readJson, withApi } from '@/lib/server/http';
import { requireIdentity } from '@/lib/server/auth';
import { habitLogInput } from '@/lib/server/dto';
import { guardMutation, newId, notFound, stamp } from '@/lib/server/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi<{ id: string }>('habits.log', async (request: NextRequest, { params }) => {
  const { id: habitId } = await params;
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;
  const uid = identity.userId;

  const input = await readJson(request, habitLogInput);
  const [habit] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.workspaceId, ws)));
  if (!habit) throw notFound('العادة');

  if (input.value === 0) {
    await db
      .delete(habitLogs)
      .where(
        and(
          eq(habitLogs.habitId, habit.id),
          eq(habitLogs.workspaceId, ws),
          eq(habitLogs.userId, uid),
          eq(habitLogs.logDate, input.date),
        ),
      );
    return json({ ok: true, value: 0 });
  }

  const [log] = await db
    .insert(habitLogs)
    .values({
      id: newId(),
      habitId: habit.id,
      workspaceId: ws,
      userId: uid,
      logDate: input.date,
      value: input.value,
    })
    .onConflictDoUpdate({
      target: [habitLogs.habitId, habitLogs.userId, habitLogs.logDate],
      set: { value: input.value, createdAt: stamp() },
    })
    .returning();

  return json(log);
});
