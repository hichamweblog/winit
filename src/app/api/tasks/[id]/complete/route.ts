import { NextRequest } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { json, withApi } from '@/lib/server/http';
import { requireIdentity } from '@/lib/server/auth';
import { guardMutation, notFound, stamp } from '@/lib/server/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi<{ id: string }>('tasks.complete', async (request: NextRequest, { params }) => {
  const { id: taskId } = await params;
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;

  // Idempotent: completing an already-completed task keeps the original
  // completion timestamp instead of resetting it on every retry.
  const now = stamp();
  const [task] = await db
    .update(tasks)
    .set({
      status: 'completed',
      completedAt: sql`COALESCE(${tasks.completedAt}, ${now})`,
      updatedAt: now,
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, ws)))
    .returning();

  if (!task) throw notFound('المهمة');
  return json(task);
});
