import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { json, withApi } from '@/lib/server/http';
import { requireIdentity } from '@/lib/server/auth';
import { guardMutation, notFound, stamp } from '@/lib/server/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi<{ id: string }>('tasks.restore', async (request: NextRequest, { params }) => {
  const { id: taskId } = await params;
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;

  const [task] = await db
    .update(tasks)
    .set({ status: 'todo', completedAt: null, updatedAt: stamp() })
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, ws)))
    .returning();

  if (!task) throw notFound('المهمة');
  return json(task);
});
