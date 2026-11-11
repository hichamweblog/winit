import { NextRequest } from 'next/server';
import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/db';
import { habitLogs, habits } from '@/db/schema';
import { enforceRateLimit, json, withApi } from '@/lib/server/http';
import { requireIdentity } from '@/lib/server/auth';
import { localDateKey } from '@/lib/core';
import { notFound, queryDate, shiftDays } from '@/lib/server/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withApi<{ id: string }>('habits.history', async (request: NextRequest, { params }) => {
  const { id: habitId } = await params;
  const identity = await requireIdentity(request);
  const ws = identity.workspaceId;
  const today = queryDate(request, 'date', localDateKey());
  enforceRateLimit(request, 'read', 600, 60 * 1000);

  const rawDays = Number(request.nextUrl.searchParams.get('days') ?? 182);
  const days = Number.isInteger(rawDays) ? Math.min(Math.max(rawDays, 7), 730) : 182;

  const [habit] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.workspaceId, ws)));
  if (!habit) throw notFound('العادة');

  const from = shiftDays(today, -(days - 1));
  const rows = await db
    .select({ date: habitLogs.logDate, value: habitLogs.value })
    .from(habitLogs)
    .where(
      and(
        eq(habitLogs.habitId, habit.id),
        eq(habitLogs.workspaceId, ws),
        gte(habitLogs.logDate, from),
        lte(habitLogs.logDate, today),
      ),
    )
    .orderBy(habitLogs.logDate);

  return json({
    habitId: habit.id,
    from,
    to: today,
    days,
    targetValue: habit.targetValue,
    unit: habit.unit,
    logs: rows,
  });
});
