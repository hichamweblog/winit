import { NextRequest } from 'next/server';
import { and, desc, eq, lt, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { journalEntries } from '@/db/schema';
import { enforceRateLimit, json, readJson, withApi } from '@/lib/server/http';
import { requireIdentity } from '@/lib/server/auth';
import { journalInput, likeTerm } from '@/lib/server/dto';
import { guardMutation, newId, stamp } from '@/lib/server/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withApi('journal.list', async (request: NextRequest) => {
  const identity = await requireIdentity(request);
  const ws = identity.workspaceId;
  const uid = identity.userId;
  enforceRateLimit(request, 'read', 600, 60 * 1000);

  const rawOffset = Number(request.nextUrl.searchParams.get('offset') ?? 0);
  const offset = Number.isInteger(rawOffset) && rawOffset >= 0 ? Math.min(rawOffset, 100000) : 0;
  const rawLimit = Number(request.nextUrl.searchParams.get('limit') ?? 40);
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 40;
  const query = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 100);

  // Optional cursor-based pagination (before date or timestamp)
  const before = request.nextUrl.searchParams.get('before')?.trim();

  const base = [eq(journalEntries.workspaceId, ws), eq(journalEntries.userId, uid)];

  const term = query ? likeTerm(query) : '';
  const searchClause = query
    ? sql`(${journalEntries.title} LIKE ${term} ESCAPE '\\' OR ${journalEntries.content} LIKE ${term} ESCAPE '\\')`
    : null;

  const cursorClause = before ? lt(journalEntries.entryDate, before) : null;

  const conditions = [...base];
  if (searchClause) conditions.push(searchClause);
  if (cursorClause) conditions.push(cursorClause);

  const where = and(...conditions);

  const [entries, countRows] = await Promise.all([
    db
      .select()
      .from(journalEntries)
      .where(where)
      .orderBy(desc(journalEntries.entryDate), desc(journalEntries.updatedAt))
      .limit(limit)
      .offset(cursorClause ? 0 : offset),
    db.select({ total: sql<number>`count(*)` }).from(journalEntries).where(and(...(searchClause ? [...base, searchClause] : base))),
  ]);

  const total = Number(countRows[0]?.total ?? 0);
  const nextCursor = entries.length === limit ? entries[entries.length - 1].entryDate : null;

  return json({
    entries,
    total,
    offset,
    limit,
    nextCursor,
  });
});

export const POST = withApi('journal.create', async (request: NextRequest) => {
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;
  const uid = identity.userId;

  const input = await readJson(request, journalInput);
  const now = stamp();
  const [entry] = await db
    .insert(journalEntries)
    .values({
      id: newId(),
      workspaceId: ws,
      userId: uid,
      entryDate: input.entryDate,
      title: input.title || null,
      content: input.content,
      mood: input.mood ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return json(entry, 201);
});
