import { NextRequest } from 'next/server';
import { and, desc, eq, gte, isNull, lte, ne, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { focusSessions, habitLogs, habits, journalEntries, projects, tasks } from '@/db/schema';
import {
  ApiError,
  assertCsrf,
  assertSameOrigin,
  enforceRateLimit,
  json,
  readJson,
  withApi,
} from '@/lib/server/http';
import {
  clearSessionCookies,
  deleteUserAccount,
  exportUserData,
  requireIdentity,
  type Identity,
} from '@/lib/server/auth';
import { localDateKey } from '@/lib/core';
import {
  dateKey,
  focusFinishInput,
  focusStartInput,
  habitInput,
  habitLogInput,
  habitPatch,
  journalInput,
  likeTerm,
  projectInput,
  reorderInput,
  taskInput,
  taskPatch,
} from '@/lib/server/dto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* ------------------------------------------------------------------ */
/*  Routing helpers                                                    */
/* ------------------------------------------------------------------ */

/**
 * Path segments are read from the URL rather than the catch-all params so the
 * handler wrapper stays uniform across routes. Every branch below matches an
 * exact segment count — `/api/tasks/a/b/c` is a 404, not a silent match on
 * `/api/tasks/:id`.
 */
const segments = (request: NextRequest) =>
  request.nextUrl.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);

const is = (path: string[], ...pattern: Array<string | null>) =>
  path.length === pattern.length && pattern.every((part, i) => part === null || part === path[i]);

const stamp = () => new Date();
const newId = () => crypto.randomUUID();

/** Query-string date, validated — an invalid value is a 400, never a silent fallback. */
function queryDate(request: NextRequest, name: string, fallback: string): string {
  const raw = request.nextUrl.searchParams.get(name);
  if (raw === null) return fallback;
  const parsed = dateKey.safeParse(raw);
  if (!parsed.success) throw new ApiError(400, `قيمة ${name} ليست تاريخاً صالحاً`, 'validation_failed');
  return parsed.data;
}

function shiftDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + delta, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Mutations require a same-origin JSON request; real sessions also need CSRF. */
function guardMutation(request: NextRequest, identity: Identity) {
  assertSameOrigin(request);
  // The demo workspace is public by design, so a CSRF token adds nothing there.
  // Real accounts always carry one.
  if (!identity.demo) assertCsrf(request);
  enforceRateLimit(request, 'write', 240, 60 * 1000);
}

const notFound = (what: string) => new ApiError(404, `${what} غير موجود`, 'not_found');

/* ------------------------------------------------------------------ */
/*  GET                                                                */
/* ------------------------------------------------------------------ */

export const GET = withApi('data.get', async (request: NextRequest) => {
  const identity = await requireIdentity(request);
  const ws = identity.workspaceId;
  const path = segments(request);
  const today = queryDate(request, 'date', localDateKey());
  const fromDate = queryDate(request, 'from', `${today.slice(0, 7)}-01`);
  enforceRateLimit(request, 'read', 600, 60 * 1000);

  if (is(path, 'account', 'export')) {
    if (identity.demo) throw new ApiError(403, 'غير متاح للحساب التجريبي', 'forbidden');
    const exportData = await exportUserData(identity.userId, ws);
    return json(exportData);
  }

  if (is(path, 'overview')) {
    const cutoffDate = shiftDays(today, -90);
    const cutoffDateObj = new Date(`${cutoffDate}T00:00:00Z`);
    const [projectRows, taskRows, habitRows, logRows, focusRows] = await Promise.all([
      db.select().from(projects).where(and(eq(projects.workspaceId, ws), eq(projects.isArchived, false))).orderBy(projects.sortOrder),
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
      db.select().from(habits).where(and(eq(habits.workspaceId, ws), eq(habits.isArchived, false))).orderBy(habits.sortOrder),
      db.select().from(habitLogs).where(and(eq(habitLogs.workspaceId, ws), gte(habitLogs.logDate, fromDate), lte(habitLogs.logDate, today))),
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
    return json({ projects: projectRows, tasks: taskRows, habits: habitRows, logs: logRows, focusSessions: focusRows, today });
  }

  if (is(path, 'tasks')) {
    return json(await db.select().from(tasks).where(eq(tasks.workspaceId, ws)).orderBy(tasks.sortOrder, desc(tasks.createdAt)));
  }

  if (is(path, 'projects')) {
    return json(await db.select().from(projects).where(and(eq(projects.workspaceId, ws), eq(projects.isArchived, false))).orderBy(projects.sortOrder));
  }

  // Contribution history for one habit. Kept out of /overview so the initial
  // payload stays small; the graph fetches its own range on demand.
  if (is(path, 'habits', null, 'history')) {
    const rawDays = Number(request.nextUrl.searchParams.get('days') ?? 182);
    const days = Number.isInteger(rawDays) ? Math.min(Math.max(rawDays, 7), 730) : 182;
    const [habit] = await db.select().from(habits).where(and(eq(habits.id, path[1]), eq(habits.workspaceId, ws)));
    if (!habit) throw notFound('العادة');
    const from = shiftDays(today, -(days - 1));
    const rows = await db
      .select({ date: habitLogs.logDate, value: habitLogs.value })
      .from(habitLogs)
      .where(and(eq(habitLogs.habitId, habit.id), eq(habitLogs.workspaceId, ws), gte(habitLogs.logDate, from), lte(habitLogs.logDate, today)))
      .orderBy(habitLogs.logDate);
    return json({ habitId: habit.id, from, to: today, days, targetValue: habit.targetValue, unit: habit.unit, logs: rows });
  }

  if (is(path, 'habits')) {
    const [habitRows, logRows] = await Promise.all([
      db.select().from(habits).where(and(eq(habits.workspaceId, ws), eq(habits.isArchived, false))).orderBy(habits.sortOrder),
      db.select().from(habitLogs).where(and(eq(habitLogs.workspaceId, ws), gte(habitLogs.logDate, fromDate), lte(habitLogs.logDate, today))),
    ]);
    return json({ habits: habitRows, logs: logRows });
  }

  if (is(path, 'focus')) {
    return json(await db.select().from(focusSessions).where(eq(focusSessions.workspaceId, ws)).orderBy(desc(focusSessions.startedAt)).limit(50));
  }

  if (is(path, 'journal')) {
    const rawOffset = Number(request.nextUrl.searchParams.get('offset') ?? 0);
    const offset = Number.isInteger(rawOffset) && rawOffset >= 0 ? Math.min(rawOffset, 100000) : 0;
    const query = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 100);
    const base = [eq(journalEntries.workspaceId, ws), eq(journalEntries.userId, identity.userId)];
    // Wildcards are escaped and an explicit ESCAPE clause is supplied, so `q=%`
    // searches for a literal percent sign instead of matching every entry.
    const term = likeTerm(query);
    const where = query
      ? and(...base, sql`(${journalEntries.title} LIKE ${term} ESCAPE '\\' OR ${journalEntries.content} LIKE ${term} ESCAPE '\\')`)
      : and(...base);
    const [entries, countRows] = await Promise.all([
      db.select().from(journalEntries).where(where).orderBy(desc(journalEntries.entryDate), desc(journalEntries.updatedAt)).limit(40).offset(offset),
      db.select({ total: sql<number>`count(*)` }).from(journalEntries).where(where),
    ]);
    return json({ entries, total: countRows[0]?.total ?? 0, offset, limit: 40 });
  }

  throw new ApiError(404, 'المسار غير موجود', 'no_route');
});

/* ------------------------------------------------------------------ */
/*  POST                                                               */
/* ------------------------------------------------------------------ */

export const POST = withApi('data.post', async (request: NextRequest) => {
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;
  const uid = identity.userId;
  const path = segments(request);

  if (is(path, 'tasks')) {
    const input = await readJson(request, taskInput);
    if (input.projectId) {
      const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, input.projectId), eq(projects.workspaceId, ws)));
      if (!project) throw notFound('المشروع');
    }
    const now = stamp();
    const [task] = await db.insert(tasks).values({
      id: newId(), workspaceId: ws, ...input, status: 'todo',
      estimatedPomodoros: input.estimatedPomodoros ?? 1, priority: input.priority ?? 'none',
      tags: input.tags ?? '', createdAt: now, updatedAt: now,
    }).returning();
    return json(task, 201);
  }

  if (is(path, 'tasks', null, 'complete')) {
    // Idempotent: completing an already-completed task keeps the original
    // completion timestamp instead of resetting it on every retry.
    const now = stamp();
    const [task] = await db.update(tasks)
      .set({ status: 'completed', completedAt: sql`COALESCE(${tasks.completedAt}, ${now})`, updatedAt: now })
      .where(and(eq(tasks.id, path[1]), eq(tasks.workspaceId, ws)))
      .returning();
    if (!task) throw notFound('المهمة');
    return json(task);
  }

  if (is(path, 'tasks', null, 'restore')) {
    const [task] = await db.update(tasks).set({ status: 'todo', completedAt: null, updatedAt: stamp() })
      .where(and(eq(tasks.id, path[1]), eq(tasks.workspaceId, ws))).returning();
    if (!task) throw notFound('المهمة');
    return json(task);
  }

  if (is(path, 'projects', 'reorder')) {
    const input = await readJson(request, reorderInput);
    await db.transaction(async (tx) => {
      for (const [index, id] of input.ids.entries()) {
        await tx.update(projects).set({ sortOrder: index }).where(and(eq(projects.id, id), eq(projects.workspaceId, ws)));
      }
    });
    return json({ ok: true });
  }

  if (is(path, 'projects')) {
    const input = await readJson(request, projectInput);
    const [project] = await db.insert(projects).values({
      id: newId(), workspaceId: ws, createdBy: uid, name: input.name,
      description: input.description ?? null, color: input.color ?? '#2A7A55',
      icon: input.icon ?? 'folder', targetWeeklyMinutes: input.targetWeeklyMinutes ?? 0, sortOrder: input.sortOrder ?? 50,
    }).returning();
    return json(project, 201);
  }

  if (is(path, 'habits', 'reorder')) {
    const input = await readJson(request, reorderInput);
    await db.transaction(async (tx) => {
      for (const [index, id] of input.ids.entries()) {
        await tx.update(habits).set({ sortOrder: index }).where(and(eq(habits.id, id), eq(habits.workspaceId, ws)));
      }
    });
    return json({ ok: true });
  }

  if (is(path, 'habits')) {
    const input = await readJson(request, habitInput);
    const [habit] = await db.insert(habits).values({
      id: newId(), workspaceId: ws, createdBy: uid, name: input.name,
      description: input.description ?? null, recordType: input.recordType, targetValue: input.targetValue,
      unit: input.unit ?? 'مرة', color: input.color ?? '#2A7A55', icon: input.icon ?? 'target',
      reminderTime: input.reminderTime ?? null, frequencyDays: '1,2,3,4,5,6,7',
      isArchived: false, showInCalendar: true, sortOrder: input.sortOrder ?? 50,
    }).returning();
    return json(habit, 201);
  }

  if (is(path, 'habits', null, 'log')) {
    const input = await readJson(request, habitLogInput);
    const [habit] = await db.select().from(habits).where(and(eq(habits.id, path[1]), eq(habits.workspaceId, ws)));
    if (!habit) throw notFound('العادة');
    if (input.value === 0) {
      await db.delete(habitLogs).where(and(eq(habitLogs.habitId, habit.id), eq(habitLogs.workspaceId, ws), eq(habitLogs.logDate, input.date)));
      return json({ ok: true, value: 0 });
    }
    const [log] = await db.insert(habitLogs).values({
      id: newId(), habitId: habit.id, workspaceId: ws, userId: uid, logDate: input.date, value: input.value,
    }).onConflictDoUpdate({
      target: [habitLogs.habitId, habitLogs.logDate],
      set: { value: input.value, createdAt: stamp() },
    }).returning();
    return json(log);
  }

  if (is(path, 'journal')) {
    const input = await readJson(request, journalInput);
    const now = stamp();
    const [entry] = await db.insert(journalEntries).values({
      id: newId(), workspaceId: ws, userId: uid, entryDate: input.entryDate,
      title: input.title || null, content: input.content, mood: input.mood ?? null,
      createdAt: now, updatedAt: now,
    }).returning();
    return json(entry, 201);
  }

  if (is(path, 'focus', 'start')) {
    const input = await readJson(request, focusStartInput);
    // Only one active timer per workspace: close stale running entries first.
    const running = await db.select().from(focusSessions).where(and(eq(focusSessions.workspaceId, ws), eq(focusSessions.isCompleted, false)));
    for (const old of running.filter((item) => !item.endedAt)) {
      const elapsed = Math.max(0, Math.floor((Date.now() - old.startedAt.getTime()) / 1000));
      await db.update(focusSessions).set({ endedAt: stamp(), actualSeconds: elapsed, isCompleted: true }).where(eq(focusSessions.id, old.id));
    }
    const task = input.taskId
      ? (await db.select().from(tasks).where(and(eq(tasks.id, input.taskId), eq(tasks.workspaceId, ws))))[0]
      : undefined;
    if (input.taskId && !task) throw notFound('المهمة');
    if (input.projectId) {
      const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, input.projectId), eq(projects.workspaceId, ws)));
      if (!project) throw notFound('المشروع');
    }
    const [session] = await db.insert(focusSessions).values({
      id: newId(), workspaceId: ws, userId: uid, taskId: input.taskId ?? null,
      projectId: input.projectId ?? task?.projectId ?? null, mode: input.mode,
      plannedSeconds: input.plannedSeconds, actualSeconds: 0, startedAt: stamp(), isCompleted: false,
    }).returning();
    return json(session, 201);
  }

  if (is(path, 'focus', null, 'finish')) {
    const input = await readJson(request, focusFinishInput);
    const [existing] = await db.select().from(focusSessions).where(and(eq(focusSessions.id, path[1]), eq(focusSessions.workspaceId, ws)));
    if (!existing || existing.isCompleted) throw new ApiError(404, 'جلسة التركيز غير موجودة أو منتهية', 'not_found');
    // Never trust a client-reported duration beyond the wall-clock elapsed time
    // (plus a small grace for clock skew and a paused tab).
    const elapsed = Math.max(0, Math.floor((Date.now() - existing.startedAt.getTime()) / 1000)) + 5;
    const actualSeconds = Math.min(input.actualSeconds, elapsed, 4 * 3600);
    const [session] = await db.update(focusSessions)
      .set({ actualSeconds, endedAt: stamp(), isCompleted: input.completed, note: input.note ?? null })
      .where(and(eq(focusSessions.id, path[1]), eq(focusSessions.workspaceId, ws), eq(focusSessions.isCompleted, false)))
      .returning();
    if (!session) throw new ApiError(404, 'جلسة التركيز غير موجودة أو منتهية', 'not_found');
    return json(session);
  }

  throw new ApiError(404, 'المسار غير موجود', 'no_route');
});

/* ------------------------------------------------------------------ */
/*  PATCH                                                              */
/* ------------------------------------------------------------------ */

export const PATCH = withApi('data.patch', async (request: NextRequest) => {
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;
  const path = segments(request);

  if (is(path, 'tasks', null)) {
    const input = await readJson(request, taskPatch);
    if (input.projectId) {
      const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, input.projectId), eq(projects.workspaceId, ws)));
      if (!project) throw notFound('المشروع');
    }
    const now = stamp();
    const [task] = await db.update(tasks).set({
      ...input,
      updatedAt: now,
      // Preserve the first completion time when the status does not change.
      ...(input.status === 'completed' ? { completedAt: sql`COALESCE(${tasks.completedAt}, ${now})` } : {}),
      ...(input.status !== undefined && input.status !== 'completed' ? { completedAt: null } : {}),
    }).where(and(eq(tasks.id, path[1]), eq(tasks.workspaceId, ws))).returning();
    if (!task) throw notFound('المهمة');
    return json(task);
  }

  if (is(path, 'projects', null)) {
    const input = await readJson(request, projectInput.partial().strict());
    const [project] = await db.update(projects).set(input)
      .where(and(eq(projects.id, path[1]), eq(projects.workspaceId, ws), eq(projects.isArchived, false))).returning();
    if (!project) throw notFound('المشروع');
    return json(project);
  }

  if (is(path, 'habits', null)) {
    const input = await readJson(request, habitPatch);
    const [habit] = await db.update(habits).set(input).where(and(eq(habits.id, path[1]), eq(habits.workspaceId, ws))).returning();
    if (!habit) throw notFound('العادة');
    return json(habit);
  }

  if (is(path, 'journal', null)) {
    const input = await readJson(request, journalInput.partial().strict());
    const [entry] = await db.update(journalEntries).set({
      ...input,
      ...(input.title !== undefined ? { title: input.title || null } : {}),
      updatedAt: stamp(),
    }).where(and(eq(journalEntries.id, path[1]), eq(journalEntries.workspaceId, ws), eq(journalEntries.userId, identity.userId))).returning();
    if (!entry) throw notFound('التدوينة');
    return json(entry);
  }

  throw new ApiError(404, 'المسار غير موجود', 'no_route');
});

/* ------------------------------------------------------------------ */
/*  DELETE                                                             */
/* ------------------------------------------------------------------ */

export const DELETE = withApi('data.delete', async (request: NextRequest) => {
  const identity = await requireIdentity(request);
  guardMutation(request, identity);
  const ws = identity.workspaceId;
  const path = segments(request);

  if (is(path, 'tasks', null)) {
    const taskId = path[1];
    const deleted = await db.transaction(async (tx) => {
      await tx.update(focusSessions).set({ taskId: null }).where(and(eq(focusSessions.taskId, taskId), eq(focusSessions.workspaceId, ws)));
      await tx.update(tasks).set({ parentTaskId: null }).where(and(eq(tasks.parentTaskId, taskId), eq(tasks.workspaceId, ws)));
      return tx.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, ws))).returning({ id: tasks.id });
    });
    if (!deleted.length) throw notFound('المهمة');
    return json({ ok: true });
  }

  if (is(path, 'projects', null)) {
    const projectId = path[1];
    const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId), eq(projects.workspaceId, ws)));
    if (!project) throw notFound('المشروع');
    // Preserve tasks when removing their parent project by moving them to Inbox,
    // and unlink any focus sessions that were linked to this project.
    await db.transaction(async (tx) => {
      await tx.update(tasks).set({ projectId: null }).where(and(eq(tasks.projectId, project.id), eq(tasks.workspaceId, ws)));
      await tx.update(focusSessions).set({ projectId: null }).where(and(eq(focusSessions.projectId, project.id), eq(focusSessions.workspaceId, ws)));
      await tx.delete(projects).where(and(eq(projects.id, project.id), eq(projects.workspaceId, ws)));
    });
    return json({ ok: true, tasksMovedToInbox: true });
  }

  if (is(path, 'habits', null)) {
    const habitId = path[1];
    const deleted = await db.transaction(async (tx) => {
      await tx.delete(habitLogs).where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.workspaceId, ws)));
      return tx.delete(habits).where(and(eq(habits.id, habitId), eq(habits.workspaceId, ws))).returning({ id: habits.id });
    });
    if (!deleted.length) throw notFound('العادة');
    return json({ ok: true, logsDeleted: true });
  }

  if (is(path, 'journal', null)) {
    const deleted = await db.delete(journalEntries)
      .where(and(eq(journalEntries.id, path[1]), eq(journalEntries.workspaceId, ws), eq(journalEntries.userId, identity.userId)))
      .returning({ id: journalEntries.id });
    if (!deleted.length) throw notFound('التدوينة');
    return json({ ok: true });
  }

  if (is(path, 'account')) {
    if (identity.demo) throw new ApiError(403, 'لا يمكن حذف الحساب التجريبي', 'forbidden');
    await deleteUserAccount(identity.userId);
    const response = json({ ok: true, deleted: true });
    clearSessionCookies(response);
    return response;
  }

  throw new ApiError(404, 'المسار غير موجود', 'no_route');
});
