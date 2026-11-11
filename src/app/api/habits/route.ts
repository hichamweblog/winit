import { NextRequest } from 'next/server';
import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/db';
import { habitLogs, habits } from '@/db/schema';
import { enforceRateLimit, json, readJson, withApi } from '@/lib/server/http';
import { requireIdentity } from '@/lib/server/auth';
import { habitInput } from '@/lib/server/dto';
import { localDateKey } from '@/lib/core';
import { guardMutation, newId, queryDate } from '@/lib/server/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withApi('habits.list', async (request: NextRequest) => {
  const identity = await requireIdentity(request);
  const ws = identity.workspaceId;
  const today = queryDate(request, 'date', localDateKey());
  const fromDate = queryDate(request, 'from', `${today.slice(0, 7)}-01`);
  enforceRateLimit(request, 'read', 600, 60 * 1000);

  const [habitRows, logRows] = await Promise.all([
    db
      .select()
      .from(habits)
      .where(and(eq(habits.workspaceId, ws), eq(habits.isArchived, false)))
      .orderBy(habits.sortOrder),
    db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.workspaceId, ws), gte(habitLogs.logDate, fromDate), lte(habitLogs.logDate, today))),
  ]);

  return json({ habits: habitRows, logs: logRows });
});

export const POST = withApi('habits.create', async (request: NextRequest) => {
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;
  const uid = identity.userId;

  const input = await readJson(request, habitInput);
  const [habit] = await db
    .insert(habits)
    .values({
      id: newId(),
      workspaceId: ws,
      createdBy: uid,
      name: input.name,
      description: input.description ?? null,
      recordType: input.recordType,
      targetValue: input.targetValue,
      unit: input.unit ?? 'مرة',
      color: input.color ?? '#2A7A55',
      icon: input.icon ?? 'target',
      reminderTime: input.reminderTime ?? null,
      frequencyDays: '1,2,3,4,5,6,7',
      isArchived: false,
      showInCalendar: true,
      sortOrder: input.sortOrder ?? 50,
    })
    .returning();

  return json(habit, 201);
});
