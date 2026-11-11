import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { habitLogs, habits } from '@/db/schema';
import { json, readJson, withApi } from '@/lib/server/http';
import { requireIdentity } from '@/lib/server/auth';
import { habitPatch } from '@/lib/server/dto';
import { guardMutation, notFound } from '@/lib/server/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = withApi<{ id: string }>('habits.patch', async (request: NextRequest, { params }) => {
  const { id: habitId } = await params;
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;

  const input = await readJson(request, habitPatch);
  const [habit] = await db
    .update(habits)
    .set(input)
    .where(and(eq(habits.id, habitId), eq(habits.workspaceId, ws)))
    .returning();

  if (!habit) throw notFound('العادة');
  return json(habit);
});

export const DELETE = withApi<{ id: string }>('habits.delete', async (request: NextRequest, { params }) => {
  const { id: habitId } = await params;
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;

  const deleted = await db.transaction(async (tx) => {
    await tx.delete(habitLogs).where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.workspaceId, ws)));
    return tx.delete(habits).where(and(eq(habits.id, habitId), eq(habits.workspaceId, ws))).returning({ id: habits.id });
  });

  if (!deleted.length) throw notFound('العادة');
  return json({ ok: true, logsDeleted: true });
});
