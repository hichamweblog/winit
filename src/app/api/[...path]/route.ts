import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, gte, like, lte, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, DEMO_USER_ID, DEMO_WORKSPACE_ID } from '@/db';
import { focusSessions, habitLogs, habits, journalEntries, projects, tasks } from '@/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ path: string[] }> };
const taskInput = z.object({
  title: z.string().trim().min(1).max(240),
  projectId: z.string().nullable().optional(),
  priority: z.enum(['none', 'low', 'medium', 'high']).optional(),
  dueDate: z.string().nullable().optional(),
  estimatedPomodoros: z.number().int().min(1).max(20).optional(),
  notes: z.string().max(5000).nullable().optional(),
  tags: z.string().max(300).optional(),
});
const projectInput = z.object({
  name: z.string().trim().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  icon: z.enum(['code', 'languages', 'book-open', 'feather', 'globe', 'folder']).optional(),
  targetWeeklyMinutes: z.number().int().min(0).max(10080).optional(),
});
const habitInput = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  recordType: z.enum(['check', 'quantity', 'duration']),
  targetValue: z.number().int().min(1).max(10000),
  unit: z.string().trim().max(30).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.enum(['book-open', 'activity', 'languages', 'target']).optional(),
  reminderTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
});
const journalMood = z.enum(['grateful', 'calm', 'energized', 'tired', 'anxious', 'reflective']);
const journalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'تاريخ التدوينة غير صالح');
const journalInput = z.object({
  entryDate: journalDate,
  title: z.string().trim().max(120).nullable().optional(),
  content: z.string().trim().min(1, 'اكتب بضعة أسطر قبل الحفظ').max(20000),
  mood: journalMood.nullable().optional(),
});
const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
const error = (message: string, status = 400) => json({ error: message }, status);
const stamp = () => new Date();
const newId = () => crypto.randomUUID();

export async function GET(request: NextRequest, context: Context) {
  const path = (await context.params).path ?? [];
  const today = request.nextUrl.searchParams.get('date') ?? (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const fromDate = request.nextUrl.searchParams.get('from') ?? `${today.slice(0, 7)}-01`;
  try {
    if (path[0] === 'overview') {
      const [projectRows, taskRows, habitRows, logRows, focusRows] = await Promise.all([
        db.select().from(projects).where(and(eq(projects.workspaceId, DEMO_WORKSPACE_ID), eq(projects.isArchived, false))).orderBy(projects.sortOrder),
        db.select().from(tasks).where(eq(tasks.workspaceId, DEMO_WORKSPACE_ID)).orderBy(tasks.sortOrder, desc(tasks.createdAt)),
        db.select().from(habits).where(and(eq(habits.workspaceId, DEMO_WORKSPACE_ID), eq(habits.isArchived, false))).orderBy(habits.sortOrder),
        db.select().from(habitLogs).where(and(eq(habitLogs.workspaceId, DEMO_WORKSPACE_ID), gte(habitLogs.logDate, fromDate), lte(habitLogs.logDate, today))),
        db.select().from(focusSessions).where(eq(focusSessions.workspaceId, DEMO_WORKSPACE_ID)).orderBy(desc(focusSessions.startedAt)).limit(200),
      ]);
      return json({ projects: projectRows, tasks: taskRows, habits: habitRows, logs: logRows, focusSessions: focusRows, today });
    }
    if (path[0] === 'tasks') return json(await db.select().from(tasks).where(eq(tasks.workspaceId, DEMO_WORKSPACE_ID)).orderBy(tasks.sortOrder, desc(tasks.createdAt)));
    if (path[0] === 'projects') return json(await db.select().from(projects).where(and(eq(projects.workspaceId, DEMO_WORKSPACE_ID), eq(projects.isArchived, false))).orderBy(projects.sortOrder));
    if (path[0] === 'habits') {
      const [habitRows, logRows] = await Promise.all([
        db.select().from(habits).where(and(eq(habits.workspaceId, DEMO_WORKSPACE_ID), eq(habits.isArchived, false))).orderBy(habits.sortOrder),
        db.select().from(habitLogs).where(and(eq(habitLogs.workspaceId, DEMO_WORKSPACE_ID), gte(habitLogs.logDate, request.nextUrl.searchParams.get('from') ?? today.slice(0, 7) + '-01'), lte(habitLogs.logDate, today))),
      ]);
      return json({ habits: habitRows, logs: logRows });
    }
    if (path[0] === 'focus') return json(await db.select().from(focusSessions).where(eq(focusSessions.workspaceId, DEMO_WORKSPACE_ID)).orderBy(desc(focusSessions.startedAt)).limit(50));
    if (path[0] === 'journal' && path.length === 1) {
      const rawOffset = Number(request.nextUrl.searchParams.get('offset') ?? 0);
      const offset = Number.isInteger(rawOffset) && rawOffset >= 0 ? Math.min(rawOffset, 100000) : 0;
      const query = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 100);
      const base = [eq(journalEntries.workspaceId, DEMO_WORKSPACE_ID), eq(journalEntries.userId, DEMO_USER_ID)];
      const where = query
        ? and(...base, or(like(journalEntries.title, `%${query}%`), like(journalEntries.content, `%${query}%`)))
        : and(...base);
      const [entries, countRows] = await Promise.all([
        db.select().from(journalEntries).where(where).orderBy(desc(journalEntries.entryDate), desc(journalEntries.updatedAt)).limit(40).offset(offset),
        db.select({ total: sql<number>`count(*)` }).from(journalEntries).where(where),
      ]);
      return json({ entries, total: countRows[0]?.total ?? 0, offset, limit: 40 });
    }
    return error('المسار غير موجود', 404);
  } catch (cause) {
    console.error('GET API error:', cause);
    return error('تعذر تحميل البيانات', 500);
  }
}

export async function POST(request: NextRequest, context: Context) {
  const path = (await context.params).path ?? [];
  let body: unknown;
  try { body = await request.json(); } catch { body = {}; }
  try {
    if (path[0] === 'tasks' && path.length === 1) {
      const input = taskInput.parse(body);
      if (input.projectId) {
        const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, input.projectId), eq(projects.workspaceId, DEMO_WORKSPACE_ID)));
        if (!project) return error('المشروع غير موجود', 404);
      }
      const now = stamp(); const id = newId();
      const [task] = await db.insert(tasks).values({ id, workspaceId: DEMO_WORKSPACE_ID, ...input, status: 'todo', estimatedPomodoros: input.estimatedPomodoros ?? 1, priority: input.priority ?? 'none', tags: input.tags ?? '', createdAt: now, updatedAt: now }).returning();
      return json(task, 201);
    }
    if (path[0] === 'tasks' && path[2] === 'complete') {
      const [task] = await db.update(tasks).set({ status: 'completed', completedAt: stamp(), updatedAt: stamp() }).where(and(eq(tasks.id, path[1]), eq(tasks.workspaceId, DEMO_WORKSPACE_ID))).returning();
      return task ? json(task) : error('المهمة غير موجودة', 404);
    }
    if (path[0] === 'tasks' && path[2] === 'restore') {
      const [task] = await db.update(tasks).set({ status: 'todo', completedAt: null, updatedAt: stamp() }).where(and(eq(tasks.id, path[1]), eq(tasks.workspaceId, DEMO_WORKSPACE_ID))).returning();
      return task ? json(task) : error('المهمة غير موجودة', 404);
    }
    if (path[0] === 'projects') {
      const input = projectInput.parse(body); const [project] = await db.insert(projects).values({ id: newId(), workspaceId: DEMO_WORKSPACE_ID, createdBy: DEMO_USER_ID, name: input.name, description: input.description ?? null, color: input.color ?? '#138A78', icon: input.icon ?? 'folder', targetWeeklyMinutes: input.targetWeeklyMinutes ?? 0, sortOrder: 50 }).returning();
      return json(project, 201);
    }
    if (path[0] === 'habits' && path.length === 1) {
      const input = habitInput.parse(body); const [habit] = await db.insert(habits).values({ id: newId(), workspaceId: DEMO_WORKSPACE_ID, createdBy: DEMO_USER_ID, name: input.name, description: input.description ?? null, recordType: input.recordType, targetValue: input.targetValue, unit: input.unit ?? 'مرة', color: input.color ?? '#138A78', icon: input.icon ?? 'target', reminderTime: input.reminderTime ?? null, frequencyDays: '1,2,3,4,5,6,7', isArchived: false, showInCalendar: true, sortOrder: 50 }).returning();
      return json(habit, 201);
    }
    if (path[0] === 'habits' && path[2] === 'log') {
      const input = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), value: z.number().int().min(0).max(10000) }).parse(body);
      const [habit] = await db.select().from(habits).where(and(eq(habits.id, path[1]), eq(habits.workspaceId, DEMO_WORKSPACE_ID)));
      if (!habit) return error('العادة غير موجودة', 404);
      if (input.value === 0) {
        await db.delete(habitLogs).where(and(eq(habitLogs.habitId, habit.id), eq(habitLogs.logDate, input.date)));
        return json({ ok: true, value: 0 });
      }
      const [log] = await db.insert(habitLogs).values({ id: newId(), habitId: habit.id, workspaceId: DEMO_WORKSPACE_ID, userId: DEMO_USER_ID, logDate: input.date, value: input.value }).onConflictDoUpdate({ target: [habitLogs.habitId, habitLogs.logDate], set: { value: input.value, createdAt: stamp() } }).returning();
      return json(log);
    }
    if (path[0] === 'journal' && path.length === 1) {
      const input = journalInput.parse(body);
      const now = stamp();
      const [entry] = await db.insert(journalEntries).values({
        id: newId(), workspaceId: DEMO_WORKSPACE_ID, userId: DEMO_USER_ID,
        entryDate: input.entryDate, title: input.title || null, content: input.content,
        mood: input.mood ?? null, createdAt: now, updatedAt: now,
      }).returning();
      return json(entry, 201);
    }
    if (path[0] === 'focus' && path[1] === 'start') {
      const input = z.object({ taskId: z.string().nullable().optional(), projectId: z.string().nullable().optional(), mode: z.enum(['pomodoro', 'stopwatch']), plannedSeconds: z.number().int().min(60).max(4 * 3600) }).parse(body);
      // Only one active timer per personal workspace: gracefully close stale running entries.
      const running = await db.select().from(focusSessions).where(and(eq(focusSessions.workspaceId, DEMO_WORKSPACE_ID), eq(focusSessions.isCompleted, false)));
      for (const old of running.filter((item) => !item.endedAt)) {
        const elapsed = Math.max(0, Math.floor((Date.now() - old.startedAt.getTime()) / 1000));
        await db.update(focusSessions).set({ endedAt: stamp(), actualSeconds: elapsed, isCompleted: true }).where(eq(focusSessions.id, old.id));
      }
      const task = input.taskId ? (await db.select().from(tasks).where(and(eq(tasks.id, input.taskId), eq(tasks.workspaceId, DEMO_WORKSPACE_ID))))[0] : undefined;
      if (input.taskId && !task) return error('المهمة غير موجودة', 404);
      if (input.projectId) {
        const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, input.projectId), eq(projects.workspaceId, DEMO_WORKSPACE_ID)));
        if (!project) return error('المشروع غير موجود', 404);
      }
      const [session] = await db.insert(focusSessions).values({ id: newId(), workspaceId: DEMO_WORKSPACE_ID, userId: DEMO_USER_ID, taskId: input.taskId ?? null, projectId: input.projectId ?? task?.projectId ?? null, mode: input.mode, plannedSeconds: input.plannedSeconds, actualSeconds: 0, startedAt: stamp(), isCompleted: false }).returning();
      return json(session, 201);
    }
    if (path[0] === 'focus' && path[2] === 'finish') {
      const input = z.object({ actualSeconds: z.number().int().min(0).max(4 * 3600), completed: z.boolean(), note: z.string().max(500).optional() }).parse(body);
      const [session] = await db.update(focusSessions).set({ actualSeconds: input.actualSeconds, endedAt: stamp(), isCompleted: input.completed, note: input.note ?? null }).where(and(eq(focusSessions.id, path[1]), eq(focusSessions.workspaceId, DEMO_WORKSPACE_ID), eq(focusSessions.isCompleted, false))).returning();
      return session ? json(session) : error('جلسة التركيز غير موجودة أو منتهية', 404);
    }
    return error('المسار غير موجود', 404);
  } catch (cause) {
    if (cause instanceof z.ZodError) return error(cause.issues[0]?.message ?? 'بيانات غير صالحة');
    console.error('POST API error:', cause);
    return error('تعذر حفظ البيانات', 500);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const path = (await context.params).path ?? [];
  let body: unknown;
  try { body = await request.json(); } catch { return error('بيانات الطلب غير صالحة'); }
  try {
    if (path[0] === 'tasks' && path[1]) {
      const input = taskInput.partial().extend({ status: z.enum(['todo', 'in_progress', 'completed']).optional() }).parse(body);
      if (input.projectId) {
        const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, input.projectId), eq(projects.workspaceId, DEMO_WORKSPACE_ID)));
        if (!project) return error('المشروع غير موجود', 404);
      }
      const [task] = await db.update(tasks).set({ ...input, updatedAt: stamp(), ...(input.status !== undefined ? { completedAt: input.status === 'completed' ? stamp() : null } : {}) }).where(and(eq(tasks.id, path[1]), eq(tasks.workspaceId, DEMO_WORKSPACE_ID))).returning();
      return task ? json(task) : error('المهمة غير موجودة', 404);
    }
    if (path[0] === 'projects' && path[1]) {
      const input = projectInput.partial().parse(body);
      const [project] = await db.update(projects).set(input).where(and(eq(projects.id, path[1]), eq(projects.workspaceId, DEMO_WORKSPACE_ID), eq(projects.isArchived, false))).returning();
      return project ? json(project) : error('المشروع غير موجود', 404);
    }
    if (path[0] === 'habits' && path[1]) {
      const input = habitInput.partial().extend({ isArchived: z.boolean().optional() }).parse(body);
      const [habit] = await db.update(habits).set(input).where(and(eq(habits.id, path[1]), eq(habits.workspaceId, DEMO_WORKSPACE_ID))).returning();
      return habit ? json(habit) : error('العادة غير موجودة', 404);
    }
    if (path[0] === 'journal' && path[1]) {
      const input = journalInput.partial().parse(body);
      const [entry] = await db.update(journalEntries).set({
        ...input,
        ...(input.title !== undefined ? { title: input.title || null } : {}),
        updatedAt: stamp(),
      }).where(and(eq(journalEntries.id, path[1]), eq(journalEntries.workspaceId, DEMO_WORKSPACE_ID), eq(journalEntries.userId, DEMO_USER_ID))).returning();
      return entry ? json(entry) : error('التدوينة غير موجودة', 404);
    }
    return error('المسار غير موجود', 404);
  } catch (cause) {
    if (cause instanceof z.ZodError) return error(cause.issues[0]?.message ?? 'بيانات غير صالحة');
    console.error('PATCH API error:', cause); return error('تعذر تحديث البيانات', 500);
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const path = (await context.params).path ?? [];
  try {
    if (path[0] === 'tasks' && path[1]) {
      const deleted = await db.delete(tasks).where(and(eq(tasks.id, path[1]), eq(tasks.workspaceId, DEMO_WORKSPACE_ID))).returning({ id: tasks.id });
      return deleted.length ? json({ ok: true }) : error('المهمة غير موجودة', 404);
    }
    if (path[0] === 'projects' && path[1]) {
      const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, path[1]), eq(projects.workspaceId, DEMO_WORKSPACE_ID)));
      if (!project) return error('المشروع غير موجود', 404);
      // Preserve tasks when removing their parent project by moving them to Inbox first.
      await db.update(tasks).set({ projectId: null }).where(and(eq(tasks.projectId, project.id), eq(tasks.workspaceId, DEMO_WORKSPACE_ID)));
      await db.delete(projects).where(and(eq(projects.id, project.id), eq(projects.workspaceId, DEMO_WORKSPACE_ID)));
      return json({ ok: true, tasksMovedToInbox: true });
    }
    if (path[0] === 'habits' && path[1]) {
      const deleted = await db.delete(habits).where(and(eq(habits.id, path[1]), eq(habits.workspaceId, DEMO_WORKSPACE_ID))).returning({ id: habits.id });
      return deleted.length ? json({ ok: true, logsDeleted: true }) : error('العادة غير موجودة', 404);
    }
    if (path[0] === 'journal' && path[1]) {
      const deleted = await db.delete(journalEntries).where(and(eq(journalEntries.id, path[1]), eq(journalEntries.workspaceId, DEMO_WORKSPACE_ID), eq(journalEntries.userId, DEMO_USER_ID))).returning({ id: journalEntries.id });
      return deleted.length ? json({ ok: true }) : error('التدوينة غير موجودة', 404);
    }
    return error('المسار غير موجود', 404);
  } catch (cause) { console.error('DELETE API error:', cause); return error('تعذر حذف العنصر', 500); }
}
