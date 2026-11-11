import { NextRequest } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { focusSessions, projects, tasks } from '@/db/schema';
import { ApiError, json, readJson, withApi } from '@/lib/server/http';
import { requireIdentity } from '@/lib/server/auth';
import { taskPatch } from '@/lib/server/dto';
import { guardMutation, notFound, stamp } from '@/lib/server/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = withApi<{ id: string }>('tasks.patch', async (request: NextRequest, { params }) => {
  const { id: taskId } = await params;
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;

  const input = await readJson(request, taskPatch);
  if (input.parentTaskId !== undefined && input.parentTaskId !== null && input.parentTaskId === taskId) {
    throw new ApiError(400, 'لا يمكن للمهمة أن تكون تابعة لنفسها', 'invalid_parent_task');
  }
  if (input.projectId) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, input.projectId), eq(projects.workspaceId, ws)));
    if (!project) throw notFound('المشروع');
  }
  if (input.parentTaskId) {
    const [parentTask] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, input.parentTaskId), eq(tasks.workspaceId, ws)));
    if (!parentTask) throw notFound('المهمة الرئيسية');
  }

  const now = stamp();
  const [task] = await db
    .update(tasks)
    .set({
      ...input,
      updatedAt: now,
      ...(input.status === 'completed' ? { completedAt: sql`COALESCE(${tasks.completedAt}, ${now})` } : {}),
      ...(input.status !== undefined && input.status !== 'completed' ? { completedAt: null } : {}),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, ws)))
    .returning();

  if (!task) throw notFound('المهمة');
  return json(task);
});

export const DELETE = withApi<{ id: string }>('tasks.delete', async (request: NextRequest, { params }) => {
  const { id: taskId } = await params;
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;

  const deleted = await db.transaction(async (tx) => {
    await tx
      .update(focusSessions)
      .set({ taskId: null })
      .where(and(eq(focusSessions.taskId, taskId), eq(focusSessions.workspaceId, ws)));
    await tx
      .update(tasks)
      .set({ parentTaskId: null })
      .where(and(eq(tasks.parentTaskId, taskId), eq(tasks.workspaceId, ws)));
    return tx.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, ws))).returning({ id: tasks.id });
  });

  if (!deleted.length) throw notFound('المهمة');
  return json({ ok: true });
});
