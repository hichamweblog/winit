import { NextRequest } from 'next/server';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { json, readJson, withApi } from '@/lib/server/http';
import { requireIdentity } from '@/lib/server/auth';
import { reorderInput } from '@/lib/server/dto';
import { guardMutation } from '@/lib/server/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi('projects.reorder', async (request: NextRequest) => {
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;

  const input = await readJson(request, reorderInput);
  if (input.ids.length > 0) {
    const cases = sql.join(
      input.ids.map((id, index) => sql`WHEN ${projects.id} = ${id} THEN ${index}`),
      sql.raw(' '),
    );
    await db
      .update(projects)
      .set({ sortOrder: sql`CASE ${cases} ELSE ${projects.sortOrder} END` })
      .where(and(eq(projects.workspaceId, ws), inArray(projects.id, input.ids)));
  }

  return json({ ok: true });
});
