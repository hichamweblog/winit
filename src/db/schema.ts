import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

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

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  dailyFocusGoalMinutes: integer('daily_focus_goal_minutes').notNull().default(120),
  theme: text('theme').notNull().default('light'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [index('sessions_user_idx').on(table.userId)],
);

export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: text('plan').notNull().default('personal'),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const memberships = pgTable(
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
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('memberships_workspace_user_idx').on(table.workspaceId, table.userId)],
);

/* ------------------------------------------------------------------ */
/*  Projects & tasks                                                   */
/* ------------------------------------------------------------------ */

export const projects = pgTable(
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
    isArchived: boolean('is_archived').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [index('projects_workspace_idx').on(table.workspaceId)],
);

export const tasks = pgTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    parentTaskId: text('parent_task_id').references((): AnyPgColumn => tasks.id, {
      onDelete: 'cascade',
    }),
    title: text('title').notNull(),
    notes: text('notes'),
    priority: text('priority').$type<Priority>().notNull().default('none'),
    status: text('status').$type<TaskStatus>().notNull().default('todo'),
    dueDate: text('due_date'), // YYYY-MM-DD in the user's timezone
    scheduledStart: timestamp('scheduled_start', { withTimezone: true, mode: 'date' }),
    scheduledEnd: timestamp('scheduled_end', { withTimezone: true, mode: 'date' }),
    estimatedPomodoros: integer('estimated_pomodoros').notNull().default(1),
    tags: text('tags').notNull().default(''),
    recurrence: text('recurrence'),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('tasks_workspace_status_idx').on(table.workspaceId, table.status),
    index('tasks_workspace_completed_idx').on(table.workspaceId, table.completedAt),
    index('tasks_project_idx').on(table.projectId),
    index('tasks_due_idx').on(table.workspaceId, table.dueDate),
    index('tasks_parent_idx').on(table.parentTaskId),
  ],
);

/* ------------------------------------------------------------------ */
/*  Focus sessions (pomodoro + stopwatch)                              */
/* ------------------------------------------------------------------ */

export const focusSessions = pgTable(
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
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' }),
    isCompleted: boolean('is_completed').notNull().default(false),
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

export const habits = pgTable(
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
    showInCalendar: boolean('show_in_calendar').notNull().default(true),
    isArchived: boolean('is_archived').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [index('habits_workspace_idx').on(table.workspaceId)],
);

export const habitLogs = pgTable(
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
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('habit_logs_habit_date_idx').on(table.habitId, table.logDate),
    index('habit_logs_workspace_date_idx').on(table.workspaceId, table.logDate),
  ],
);

/* ------------------------------------------------------------------ */
/*  Journal entries                                                   */
/* ------------------------------------------------------------------ */

export const journalEntries = pgTable(
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
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
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
