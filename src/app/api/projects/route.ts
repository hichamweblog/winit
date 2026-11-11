import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { enforceRateLimit, json, readJson, withApi } from '@/lib/server/http';
import { requireIdentity } from '@/lib/server/auth';
import { projectInput } from '@/lib/server/dto';
import { guardMutation, newId } from '@/lib/server/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withApi('projects.list', async (request: NextRequest) => {
  const identity = await requireIdentity(request);
  const ws = identity.workspaceId;
  enforceRateLimit(request, 'read', 600, 60 * 1000);

  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.workspaceId, ws), eq(projects.isArchived, false)))
    .orderBy(projects.sortOrder);

  return json(rows);
});

export const POST = withApi('projects.create', async (request: NextRequest) => {
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;
  const uid = identity.userId;

  const input = await readJson(request, projectInput);
  const [project] = await db
    .insert(projects)
    .values({
      id: newId(),
      workspaceId: ws,
      createdBy: uid,
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? '#2A7A55',
      icon: input.icon ?? 'folder',
      targetWeeklyMinutes: input.targetWeeklyMinutes ?? 0,
      sortOrder: input.sortOrder ?? 50,
    })
    .returning();

  return json(project, 201);
});
