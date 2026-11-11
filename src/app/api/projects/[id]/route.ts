import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { focusSessions, projects, tasks } from '@/db/schema';
import { json, readJson, withApi } from '@/lib/server/http';
import { requireIdentity } from '@/lib/server/auth';
import { projectPatch } from '@/lib/server/dto';
import { guardMutation, notFound } from '@/lib/server/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = withApi<{ id: string }>('projects.patch', async (request: NextRequest, { params }) => {
  const { id: projectId } = await params;
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;

  const input = await readJson(request, projectPatch);
  const [project] = await db
    .update(projects)
    .set(input)
    .where(and(eq(projects.id, projectId), eq(projects.workspaceId, ws)))
    .returning();

  if (!project) throw notFound('المشروع');
  return json(project);
});

export const DELETE = withApi<{ id: string }>('projects.delete', async (request: NextRequest, { params }) => {
  const { id: projectId } = await params;
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.workspaceId, ws)));
  if (!project) throw notFound('المشروع');

  // Preserve tasks when removing their parent project by moving them to Inbox,
  // and unlink any focus sessions that were linked to this project.
  await db.transaction(async (tx) => {
    await tx.update(tasks).set({ projectId: null }).where(and(eq(tasks.projectId, project.id), eq(tasks.workspaceId, ws)));
    await tx.update(focusSessions).set({ projectId: null }).where(and(eq(focusSessions.projectId, project.id), eq(focusSessions.workspaceId, ws)));
    await tx.delete(projects).where(and(eq(projects.id, project.id), eq(projects.workspaceId, ws)));
  });

  return json({ ok: true, tasksMovedToInbox: true });
});
