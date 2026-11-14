import { NextRequest } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { focusSessions, projects, tasks } from '@/db/schema';
import { ApiError, json, readJson, withApi } from '@/lib/server/http';
import { requireIdentity } from '@/lib/server/auth';
import { focusStartInput } from '@/lib/server/dto';
import { guardMutation, newId, notFound, stamp } from '@/lib/server/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function interruptedFocusValues(old: { startedAt: Date; mode: 'pomodoro' | 'stopwatch'; plannedSeconds: number }, endedAt: Date) {
  const elapsed = Math.max(0, Math.floor((endedAt.getTime() - old.startedAt.getTime()) / 1000));
  return {
    endedAt,
    actualSeconds: old.mode === 'pomodoro' ? Math.min(elapsed, old.plannedSeconds) : elapsed,
    isCompleted: false,
  };
}

export const POST = withApi('focus.start', async (request: NextRequest) => {
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;
  const uid = identity.userId;

  const input = await readJson(request, focusStartInput);

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
    if (task && task.projectId !== input.projectId) {
      throw new ApiError(400, 'المهمة لا تتبع المشروع المحدد', 'invalid_task_project');
    }
  }

  if (task?.projectId) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, task.projectId), eq(projects.workspaceId, ws)));
    if (!project) throw notFound('المشروع');
  }

  const now = stamp();
  let session;
  try {
    [session] = await db.transaction(async (tx) => {
      const running = await tx
        .select({
          id: focusSessions.id,
          startedAt: focusSessions.startedAt,
          mode: focusSessions.mode,
          plannedSeconds: focusSessions.plannedSeconds,
        })
        .from(focusSessions)
        .where(
          and(
            eq(focusSessions.workspaceId, ws),
            eq(focusSessions.userId, uid),
            eq(focusSessions.isCompleted, false),
            isNull(focusSessions.endedAt),
          ),
        );

      for (const old of running) {
        await tx
          .update(focusSessions)
          .set(interruptedFocusValues(old, now))
          .where(
            and(
              eq(focusSessions.id, old.id),
              eq(focusSessions.isCompleted, false),
              isNull(focusSessions.endedAt),
            ),
          );
      }

      return tx
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
          startedAt: now,
          isCompleted: false,
        })
        .returning();
    });
  } catch (cause) {
    if ((cause as { code?: string })?.code === '23505') {
      throw new ApiError(409, 'توجد جلسة تركيز نشطة بالفعل', 'active_focus_session');
    }
    throw cause;
  }

  return json(session, 201);
});
