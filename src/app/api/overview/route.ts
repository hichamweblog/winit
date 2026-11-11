import { NextRequest } from 'next/server';
import { and, desc, eq, gte, isNull, lte, ne, or } from 'drizzle-orm';
import { db } from '@/db';
import { focusSessions, habitLogs, habits, projects, tasks } from '@/db/schema';
import { enforceRateLimit, json, withApi } from '@/lib/server/http';
import { requireIdentity } from '@/lib/server/auth';
import { localDateKey } from '@/lib/core';
import { queryDate, shiftDays } from '@/lib/server/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withApi('overview.get', async (request: NextRequest) => {
  const identity = await requireIdentity(request);
  const ws = identity.workspaceId;
  const today = queryDate(request, 'date', localDateKey());
  const fromDate = queryDate(request, 'from', `${today.slice(0, 7)}-01`);
  enforceRateLimit(request, 'read', 600, 60 * 1000);

  const cutoffDate = shiftDays(today, -90);
  const cutoffDateObj = new Date(`${cutoffDate}T00:00:00Z`);

  const [projectRows, taskRows, habitRows, logRows, focusRows] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(and(eq(projects.workspaceId, ws), eq(projects.isArchived, false)))
      .orderBy(projects.sortOrder),
    db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, ws),
          or(
            ne(tasks.status, 'completed'),
            gte(tasks.dueDate, cutoffDate),
            gte(tasks.completedAt, cutoffDateObj),
            isNull(tasks.completedAt),
          ),
        ),
      )
      .orderBy(tasks.sortOrder, desc(tasks.createdAt)),
    db
      .select()
      .from(habits)
      .where(and(eq(habits.workspaceId, ws), eq(habits.isArchived, false)))
      .orderBy(habits.sortOrder),
    db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.workspaceId, ws), gte(habitLogs.logDate, fromDate), lte(habitLogs.logDate, today))),
    db
      .select()
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.workspaceId, ws),
          or(
            eq(focusSessions.isCompleted, false),
            gte(focusSessions.startedAt, new Date(`${cutoffDate}T00:00:00Z`)),
          ),
        ),
      )
      .orderBy(desc(focusSessions.startedAt))
      .limit(300),
  ]);

  return json({
    projects: projectRows,
    tasks: taskRows,
    habits: habitRows,
    logs: logRows,
    focusSessions: focusRows,
    today,
  });
});
