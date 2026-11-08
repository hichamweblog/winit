/**
 * Strict request DTOs.
 *
 * Every object is `.strict()`, so an unknown key is a 400 rather than a silently
 * ignored field. Dates are validated as real calendar dates, not just a regex
 * shape — `2026-02-31` must not reach the database.
 */
import { z } from 'zod';
import { PROJECT_ICON_IDS } from '@/lib/project-icons';
import { HABIT_ICON_IDS } from '@/lib/habit-icons';

/** A real calendar date in YYYY-MM-DD, checked by round-tripping through UTC. */
export const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'التاريخ يجب أن يكون بالصيغة YYYY-MM-DD')
  .refine((value) => {
    const [y, m, d] = value.split('-').map(Number);
    if (y < 1970 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return false;
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  }, 'التاريخ غير موجود في التقويم');

export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'اللون يجب أن يكون بصيغة #RRGGBB');
export const identifier = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, 'معرّف غير صالح');
export const clockTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'الوقت يجب أن يكون بالصيغة HH:MM');

export const taskInput = z
  .object({
    title: z.string().trim().min(1, 'اكتب عنوان المهمة').max(240),
    projectId: identifier.nullable().optional(),
    priority: z.enum(['none', 'low', 'medium', 'high']).optional(),
    dueDate: dateKey.nullable().optional(),
    estimatedPomodoros: z.number().int().min(1).max(20).optional(),
    notes: z.string().max(5000).nullable().optional(),
    tags: z.string().max(300).optional(),
  })
  .strict();

export const taskPatch = taskInput
  .partial()
  .extend({ status: z.enum(['todo', 'in_progress', 'completed']).optional() })
  .strict();

export const projectInput = z
  .object({
    name: z.string().trim().min(1, 'اكتب اسم المشروع').max(100),
    color: hexColor.optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    // Derived from the picker catalogue so the API can never lag behind the UI.
    icon: z.enum(PROJECT_ICON_IDS).optional(),
    targetWeeklyMinutes: z.number().int().min(0).max(10080).optional(),
  })
  .strict();

export const habitInput = z
  .object({
    name: z.string().trim().min(1, 'اكتب اسم العادة').max(100),
    description: z.string().trim().max(500).nullable().optional(),
    recordType: z.enum(['check', 'quantity', 'duration']),
    targetValue: z.number().int().min(1).max(10000),
    unit: z.string().trim().max(30).optional(),
    color: hexColor.optional(),
    icon: z.enum(HABIT_ICON_IDS).optional(),
    reminderTime: clockTime.nullable().optional(),
  })
  .strict();

export const habitPatch = habitInput.partial().extend({ isArchived: z.boolean().optional() }).strict();

export const habitLogInput = z
  .object({
    date: dateKey,
    value: z.number().int().min(0).max(10000),
  })
  .strict();

export const journalMood = z.enum(['grateful', 'calm', 'energized', 'tired', 'anxious', 'reflective']);

export const journalInput = z
  .object({
    entryDate: dateKey,
    title: z.string().trim().max(120).nullable().optional(),
    content: z.string().trim().min(1, 'اكتب بضعة أسطر قبل الحفظ').max(20000),
    mood: journalMood.nullable().optional(),
  })
  .strict();

export const focusStartInput = z
  .object({
    taskId: identifier.nullable().optional(),
    projectId: identifier.nullable().optional(),
    mode: z.enum(['pomodoro', 'stopwatch']),
    plannedSeconds: z.number().int().min(60).max(4 * 3600),
  })
  .strict();

export const focusFinishInput = z
  .object({
    actualSeconds: z.number().int().min(0).max(4 * 3600),
    completed: z.boolean(),
    note: z.string().max(500).optional(),
  })
  .strict();

export const emailInput = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, 'البريد الإلكتروني قصير جداً')
  .max(254)
  .email('البريد الإلكتروني غير صالح');

/**
 * Password policy: length over composition rules. 10 characters minimum, 128
 * maximum so a passphrase is fine and scrypt cannot be used as a CPU amplifier.
 */
export const passwordInput = z
  .string()
  .min(10, 'كلمة المرور يجب أن تكون 10 أحرف على الأقل')
  .max(128, 'كلمة المرور طويلة جداً');

export const registerInput = z
  .object({
    email: emailInput,
    name: z.string().trim().min(1, 'اكتب اسمك').max(80),
    password: passwordInput,
  })
  .strict();

export const loginInput = z
  .object({
    email: emailInput,
    password: z.string().min(1).max(128),
  })
  .strict();

/** Escapes LIKE wildcards so `q=%` cannot turn into "match everything". */
export function likeTerm(raw: string): string {
  return `%${raw.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
