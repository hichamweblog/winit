import { NextRequest } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { enforceRateLimit, json, readJson, withApi } from '@/lib/server/http';
import { requireIdentity } from '@/lib/server/auth';
import { taskInput } from '@/lib/server/dto';
import { guardMutation, newId, notFound, stamp } from '@/lib/server/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withApi('tasks.list', async (request: NextRequest) => {
  const identity = await requireIdentity(request);
  const ws = identity.workspaceId;
  enforceRateLimit(request, 'read', 600, 60 * 1000);

  const rawLimit = Number(request.nextUrl.searchParams.get('limit') ?? 200);
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 1000) : 200;
  const rawOffset = Number(request.nextUrl.searchParams.get('offset') ?? 0);
  const offset = Number.isInteger(rawOffset) && rawOffset >= 0 ? Math.min(rawOffset, 100000) : 0;

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(eq(tasks.workspaceId, ws))
      .orderBy(tasks.sortOrder, desc(tasks.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: sql<number>`count(*)` }).from(tasks).where(eq(tasks.workspaceId, ws)),
  ]);

  const total = Number(countRows[0]?.total ?? 0);
  return json({ tasks: rows, total, limit, offset });
});

export const POST = withApi('tasks.create', async (request: NextRequest) => {
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;

  const input = await readJson(request, taskInput);
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
    .insert(tasks)
    .values({
      id: newId(),
      workspaceId: ws,
      ...input,
      status: 'todo',
      parentTaskId: input.parentTaskId ?? null,
      estimatedPomodoros: input.estimatedPomodoros ?? 1,
      priority: input.priority ?? 'none',
      tags: input.tags ?? '',
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return json(task, 201);
});
