import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { journalEntries } from '@/db/schema';
import { json, readJson, withApi } from '@/lib/server/http';
import { requireIdentity } from '@/lib/server/auth';
import { journalInput } from '@/lib/server/dto';
import { guardMutation, notFound, stamp } from '@/lib/server/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = withApi<{ id: string }>('journal.patch', async (request: NextRequest, { params }) => {
  const { id: entryId } = await params;
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;
  const uid = identity.userId;

  const input = await readJson(request, journalInput.partial().strict());
  const [entry] = await db
    .update(journalEntries)
    .set({
      ...input,
      ...(input.title !== undefined ? { title: input.title || null } : {}),
      updatedAt: stamp(),
    })
    .where(
      and(
        eq(journalEntries.id, entryId),
        eq(journalEntries.workspaceId, ws),
        eq(journalEntries.userId, uid),
      ),
    )
    .returning();

  if (!entry) throw notFound('التدوينة');
  return json(entry);
});

export const DELETE = withApi<{ id: string }>('journal.delete', async (request: NextRequest, { params }) => {
  const { id: entryId } = await params;
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;
  const uid = identity.userId;

  const deleted = await db
    .delete(journalEntries)
    .where(
      and(
        eq(journalEntries.id, entryId),
        eq(journalEntries.workspaceId, ws),
        eq(journalEntries.userId, uid),
      ),
    )
    .returning({ id: journalEntries.id });

  if (!deleted.length) throw notFound('التدوينة');
  return json({ ok: true });
});
