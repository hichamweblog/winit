import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/* ------------------------------------------------------------------ */
/*  Domain types                                                       */
/* ------------------------------------------------------------------ */

export type Priority = 'none' | 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type FocusMode = 'pomodoro' | 'stopwatch';
export type HabitRecordType = 'check' | 'quantity' | 'duration';
export type MemberRole = 'owner' | 'admin' | 'member';
export type JournalMood = 'grateful' | 'calm' | 'energized' | 'tired' | 'anxious' | 'reflective';

/* ------------------------------------------------------------------ */
/*  Identity & tenancy                                                 */
/*  Every tenant-owned row carries workspaceId, so the same schema     */
/*  powers a single-user personal workspace and a multi-tenant SaaS.   */
/* ------------------------------------------------------------------ */

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  dailyFocusGoalMinutes: integer('daily_focus_goal_minutes').notNull().default(120),
  theme: text('theme').notNull().default('light'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
});

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => [index('sessions_user_idx').on(table.userId)],
);

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: text('plan').notNull().default('personal'),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
});

export const memberships = sqliteTable(
  'memberships',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').$type<MemberRole>().notNull().default('member'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => [uniqueIndex('memberships_workspace_user_idx').on(table.workspaceId, table.userId)],
);

/* ------------------------------------------------------------------ */
/*  Projects & tasks                                                   */
/* ------------------------------------------------------------------ */

export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    color: text('color').notNull().default('#0f766e'),
    icon: text('icon').notNull().default('folder'),
    targetWeeklyMinutes: integer('target_weekly_minutes').notNull().default(0),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => [index('projects_workspace_idx').on(table.workspaceId)],
);

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    parentTaskId: text('parent_task_id').references((): AnySQLiteColumn => tasks.id, {
      onDelete: 'cascade',
    }),
    title: text('title').notNull(),
    notes: text('notes'),
    priority: text('priority').$type<Priority>().notNull().default('none'),
    status: text('status').$type<TaskStatus>().notNull().default('todo'),
    dueDate: text('due_date'), // YYYY-MM-DD in the user's timezone
    scheduledStart: integer('scheduled_start', { mode: 'timestamp_ms' }),
    scheduledEnd: integer('scheduled_end', { mode: 'timestamp_ms' }),
    estimatedPomodoros: integer('estimated_pomodoros').notNull().default(1),
    tags: text('tags').notNull().default(''),
    recurrence: text('recurrence'),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index('tasks_workspace_status_idx').on(table.workspaceId, table.status),
    index('tasks_project_idx').on(table.projectId),
    index('tasks_due_idx').on(table.workspaceId, table.dueDate),
    index('tasks_parent_idx').on(table.parentTaskId),
  ],
);

/* ------------------------------------------------------------------ */
/*  Focus sessions (pomodoro + stopwatch)                              */
/* ------------------------------------------------------------------ */

export const focusSessions = sqliteTable(
  'focus_sessions',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    taskId: text('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    mode: text('mode').$type<FocusMode>().notNull().default('pomodoro'),
    plannedSeconds: integer('planned_seconds').notNull().default(1500),
    actualSeconds: integer('actual_seconds').notNull().default(0),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    endedAt: integer('ended_at', { mode: 'timestamp_ms' }),
    isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
    note: text('note'),
  },
  (table) => [
    index('focus_workspace_started_idx').on(table.workspaceId, table.startedAt),
    index('focus_project_idx').on(table.projectId),
  ],
);

/* ------------------------------------------------------------------ */
/*  Habits & habit logs                                                */
/* ------------------------------------------------------------------ */

export const habits = sqliteTable(
  'habits',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    icon: text('icon').notNull().default('target'),
    color: text('color').notNull().default('#0f766e'),
    recordType: text('record_type').$type<HabitRecordType>().notNull().default('check'),
    targetValue: integer('target_value').notNull().default(1),
    unit: text('unit').notNull().default('مرة'),
    frequencyDays: text('frequency_days').notNull().default('1,2,3,4,5,6,7'),
    reminderTime: text('reminder_time'),
    showInCalendar: integer('show_in_calendar', { mode: 'boolean' }).notNull().default(true),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => [index('habits_workspace_idx').on(table.workspaceId)],
);

export const habitLogs = sqliteTable(
  'habit_logs',
  {
    id: text('id').primaryKey(),
    habitId: text('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    logDate: text('log_date').notNull(), // YYYY-MM-DD
    value: integer('value').notNull().default(1),
    note: text('note'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex('habit_logs_habit_date_idx').on(table.habitId, table.logDate),
    index('habit_logs_workspace_date_idx').on(table.workspaceId, table.logDate),
  ],
);

/* ------------------------------------------------------------------ */
/*  Journal entries                                                   */
/* ------------------------------------------------------------------ */

export const journalEntries = sqliteTable(
  'journal_entries',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    entryDate: text('entry_date').notNull(), // YYYY-MM-DD in the user's timezone
    title: text('title'),
    content: text('content').notNull(),
    mood: text('mood').$type<JournalMood>(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index('journal_workspace_date_idx').on(table.workspaceId, table.entryDate),
    index('journal_user_date_idx').on(table.userId, table.entryDate),
  ],
);

/* ------------------------------------------------------------------ */
/*  Relations (available through db.query.*)                           */
/* ------------------------------------------------------------------ */

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  sessions: many(sessions),
  journalEntries: many(journalEntries),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, { fields: [workspaces.ownerId], references: [users.id] }),
  memberships: many(memberships),
  projects: many(projects),
  journalEntries: many(journalEntries),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [projects.workspaceId], references: [workspaces.id] }),
  tasks: many(tasks),
  focusSessions: many(focusSessions),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  parent: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
    relationName: 'subtasks',
  }),
  subtasks: many(tasks, { relationName: 'subtasks' }),
  focusSessions: many(focusSessions),
}));

export const habitsRelations = relations(habits, ({ many }) => ({
  logs: many(habitLogs),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
  workspace: one(workspaces, { fields: [journalEntries.workspaceId], references: [workspaces.id] }),
  user: one(users, { fields: [journalEntries.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type FocusSession = typeof focusSessions.$inferSelect;
export type Habit = typeof habits.$inferSelect;
export type HabitLog = typeof habitLogs.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
