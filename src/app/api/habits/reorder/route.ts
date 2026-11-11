import { NextRequest } from 'next/server';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { habits } from '@/db/schema';
import { json, readJson, withApi } from '@/lib/server/http';
import { requireIdentity } from '@/lib/server/auth';
import { reorderInput } from '@/lib/server/dto';
import { guardMutation } from '@/lib/server/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withApi('habits.reorder', async (request: NextRequest) => {
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;

  const input = await readJson(request, reorderInput);
  if (input.ids.length > 0) {
    const cases = sql.join(
      input.ids.map((id, index) => sql`WHEN ${habits.id} = ${id} THEN ${index}`),
      sql.raw(' '),
    );
    await db
      .update(habits)
      .set({ sortOrder: sql`CASE ${cases} ELSE ${habits.sortOrder} END` })
      .where(and(eq(habits.workspaceId, ws), inArray(habits.id, input.ids)));
  }

  return json({ ok: true });
});
