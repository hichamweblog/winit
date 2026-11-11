import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { focusSessions, projects, tasks } from '@/db/schema';
import { json, readJson, withApi } from '@/lib/server/http';
import { requireIdentity } from '@/lib/server/auth';
import { focusStartInput } from '@/lib/server/dto';
import { guardMutation, newId, notFound, stamp } from '@/lib/server/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi('focus.start', async (request: NextRequest) => {
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;
  const uid = identity.userId;

  const input = await readJson(request, focusStartInput);

  // Only one active timer per user: close stale running entries first.
  const running = await db
    .select()
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.workspaceId, ws),
        eq(focusSessions.userId, uid),
        eq(focusSessions.isCompleted, false),
      ),
    );

  for (const old of running.filter((item) => !item.endedAt)) {
    const elapsed = Math.max(0, Math.floor((Date.now() - old.startedAt.getTime()) / 1000));
    await db
      .update(focusSessions)
      .set({ endedAt: stamp(), actualSeconds: elapsed, isCompleted: true })
      .where(eq(focusSessions.id, old.id));
  }

  const task = input.taskId
    ? (await db.select().from(tasks).where(and(eq(tasks.id, input.taskId), eq(tasks.workspaceId, ws))))[0]
    : undefined;
  if (input.taskId && !task) throw notFound('المهمة');

  if (input.projectId) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, input.projectId), eq(projects.workspaceId, ws)));
    if (!project) throw notFound('المشروع');
  }

  const [session] = await db
    .insert(focusSessions)
    .values({
      id: newId(),
      workspaceId: ws,
      userId: uid,
      taskId: input.taskId ?? null,
      projectId: input.projectId ?? task?.projectId ?? null,
      mode: input.mode,
      plannedSeconds: input.plannedSeconds,
      actualSeconds: 0,
      startedAt: stamp(),
      isCompleted: false,
    })
    .returning();

  return json(session, 201);
});
