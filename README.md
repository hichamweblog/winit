# الخطة الهندسية والمعمارية لبناء تطبيق الإنتاجية وإدارة المشاريع الشامل (بأسلوب TickTick)

## 1. الرؤية الهندسية تجمع بين الاستخدام الشخصي وقابلية التوسع إلى نظام SaaS عام

يهدف هذا المشروع إلى بناء نظام إنتاجية متكامل يستلهم أقوى خصائص [منصة TickTick لإدارة المهام والوقت](https://ticktick.com/features) ويطوّعها لخدمة أهدافك الشخصية الحالية (إتقان اللغة الإنجليزية، دراسة العلوم الشرعية، التعمق في اللغة العربية، الثقافة العامة، البرمجة، والروتين اليومي للقرآن والرياضة)، مع تصميم معماري يسمح بتحويله لاحقاً إلى منتج عام متعدد المستخدمين (Multi-tenant SaaS) دون الحاجة لإعادة كتابة الكود من الصفر.

### لماذا نصمم بنية قابلة للتوسع منذ اليوم الأول؟ (Why Before How)

الخطأ الشائع عند بناء تطبيق شخصي هو ربط منطق العمل (Business Logic) بافتراض وجود مستخدم واحد فقط في قاعدة البيانات، مما يجعل تحويل التطبيق لاحقاً إلى خدمة عامة عملية مكلفة تتطلب تعديل كل جدول وكل استعلام. الحل الهندسي المتوازن هو:

- **عزل البيانات عبر معرف المستخدم (`userId`) في جميع الجداول الأساسية:** حتى لو كنت المستخدم الوحيد في المرحلة الأولى (MVP)، فإن وجود حقل `user_id` مفهرس في جداول المشاريع والمهام والعادات وجلسات التركيز يجعل الانتقال إلى تعدد المستخدمين مسألة تفعيل طبقة المصادقة فحسب.
- **اعتماد البرمجة الوظيفية (Functional Patterns) وفصل الطبقات:** بدلاً من بناء أصناف (Classes) معقدة متشابكة، نعتمد دوال نقية (Pure Functions) لخدمات المجال (Domain Services) يسهل اختبارها وتعديلها بشكل مستقل.

## 2. تحليل خصائص TickTick الأساسية وكيفية توظيفها لأهدافك

يجمع [تطبيق TickTick الرسمي](https://ticktick.com/features) خمس أدوات إنتاجية في بيئة واحدة لتقليل التشتت بين التطبيقات. يوضح الجدول التالي كيف سنقتبس هذه الخصائص ونحولها إلى وحدات برمجية تخدم مشاريعك:

| الميزة المستلهمة من المرجع | الوظيفة الأساسية في تطبيقك | تطبيق عملي على مشاريعك الشخصية | المرجع التقني للخاصية |
| :--- | :--- | :--- | :--- |
| **إدارة المشاريع والمهام المرنة (Tasks & Subtasks)** | تقسيم المشاريع الكبيرة إلى أقسام، مهام رئيسية، مهام فرعية (Checklists)، ووسوم (`#tags`) مع 4 مستويات للأولوية | مشروع "العلوم الشرعية" ينقسم إلى مهام فرعية حسب الكتب أو الدروس مع تحديد أولوية الدرس اليومي | [TickTick Features](https://ticktick.com/features) |
| **القوائم الذكية ومصفوفة أيزنهاور (Smart Lists & Eisenhower Matrix)** | تصفية تلقائية للمهام (`اليوم`، `الأيام الـ 7 القادمة`) وتوزيعها في 4 أرباع حسب الأهمية والاستعجال | التركيز المكثف على "البرمجة" في مربع (مهم وعاجل) وجدولة "الثقافة العامة" في مربع (مهم وغير عاجل) | [TickTick Eisenhower Matrix Guide](https://help.ticktick.com/articles/7055782055577124864) |
| **مؤقت التركيز المدمج (Pomodoro & Stopwatch)** | ربط جلسات البومودورو (25 دقيقة تركيز + 5 دقائق راحة) أو المؤقت التصاعدي بمهمة ومشروع محددين لحساب الساعات الفعلية | حساب عدد ساعات التركيز الأسبوعية في "البرمجة" مقارنة بـ "اللغة الإنجليزية" بدقة | [TickTick Pomodoro Guide](https://help.ticktick.com/articles/7055782025193586688) |
| **متتبع العادات المستقل والمترابط (Habit Tracker)** | تتبع العادات اليومية والأسبوعية بنظام التسجيل التلقائي (كأس ماء/ورد ثابت) أو التسجيل اليدوي (عدد صفحات قراءة) مع خريطة حرارية (Heatmap) | تثبيت ورد القرآن الكريم والرياضة كعادات يومية ثابتة لا تختلط بمهام المشاريع المؤقتة | [TickTick Habit Tracking Guide](https://help.ticktick.com/articles/7055781805944733696) |
| **التقويم الزمني المتكامل (Integrated Calendar Views)** | عرض يومي وأسبوعي وشهري يدمج المهام المجدولة زمنياً (Time-blocking) مع أوقات العادات وجلسات البومودورو المكتملة | تخطيط اليوم بالساعة عبر سحب المهام غير المؤرخة وإفلاتها في الفترات الزمنية المتاحة | [TickTick Widgets & Views](https://help.ticktick.com/articles/7055780404896202752) |

## 3. المكدس التقني المقترح (Tech Stack) ومبررات الاختيار الهندسية

تم اختيار هذا المكدس ليوفر أماناً صارماً للأنواع (End-to-End Type Safety) من قاعدة البيانات وحتى واجهة المستخدم، مع سرعة عالية وقابلية تشغيل على الخوادم التقليدية أو الحافة (Edge):

| الطبقة المعمارية | التقنية المختارة | لماذا هذا الاختيار هندسياً؟ (Trade-offs & Rationale) | التوثيق الرسمي |
| :--- | :--- | :--- | :--- |
| **لغة البرمجة الأساسية** | **TypeScript** | تمنع أخطاء القيم الفارغة وتضمن تطابق شكل البيانات بين الواجهة والخادم قبل التشغيل | [TypeScript Documentation](https://www.typescriptlang.org/docs/) |
| **إطار الواجهة الأمامية والتطبيق** | **Next.js (App Router)** | يوفر تصييراً هجيناً (SSR/CSR) مثالياً للوحات التحكم التفاعلية والتقويم مع سهولة النشر | [Next.js Documentation](https://nextjs.org/docs) |
| **إطار الـ API والخلفية (Backend)** | **Hono** | إطار خفيف وسريع جداً مبني على معايير الويب، يدعم Hono RPC لمشاركة الأنواع مباشرة مع الواجهة دون توليد كود يدوي | [Hono Documentation](https://hono.dev/docs/) |
| **قاعدة البيانات العلائقية** | **PostgreSQL** | العلاقات بين المشاريع والمهام الفرعية وجلسات البومودورو وسجلات العادات تتطلب سلامة مرجعية (ACID Transactions) واستعلامات تجميعية دقيقة للإحصائيات | [PostgreSQL Documentation](https://www.postgresql.org) |
| **طبقة الـ ORM وإدارة الجداول** | **Drizzle ORM** | خفيف بلا تبعيات، يكتب استعلامات قريبة من SQL الحقيقي، ويتكامل مباشرة مع Zod لتوليد مخططات التحقق تلقائياً | [Drizzle ORM Zod Documentation](https://orm.drizzle.team/docs/zod) |
| **التحقق من المدخلات والعقود** | **Zod (`drizzle-zod`)** | مصدر حقيقة واحد (Single Source of Truth): تعريف الجدول في Drizzle يولّد مخطط التحقق لـ Hono API ونوع البيانات للواجهة | [HONC Stack Drizzle Guide](https://docs.honc.dev/stack/drizzle/) |
| **التصميم والواجهة الرسومية** | **Tailwind CSS** | بناء واجهات نظيفة وسريعة الاستجابة تدعم العربية (RTL) والإنجليزية (LTR) والوضع الليلي بسهولة | [Tailwind CSS Documentation](https://tailwindcss.com/docs) |
| **الاختبارات الآلية الشاملة** | **Playwright** | اختبار مسارات المستخدم الحرجة (تشغيل المؤقت، إكمال مهمة، تسجيل عادة) عبر متصفح حقيقي | [Playwright Testing Documentation](https://playwright.dev/docs/intro) |

## 4. التصميم المعماري وهيكلية المجلدات (Clean Functional Architecture)

لتجنب تشابك الكود مع نمو التطبيق، نفصل بين طبقة التوجيه (Routing)، ومنطق المجال الوظيفي (Functional Domain Services)، وطبقة الوصول للبيانات (Repositories/Queries):

```text
src/
├── db/
│   ├── schema/                 # تعريف جداول Drizzle (المصدر الوحيد للحقيقة)
│   │   ├── users.ts
│   │   ├── projects.ts
│   │   ├── tasks.ts
│   │   ├── habits.ts
│   │   └── pomodoro.ts
│   └── index.ts                # اتصال قاعدة البيانات PostgreSQL
├── modules/                    # تقسيم معياري حسب الميزة (Feature-based Modules)
│   ├── tasks/
│   │   ├── tasks.schema.ts     # مخططات Zod المشتقة عبر drizzle-zod
│   │   ├── tasks.service.ts    # دوال نقية لمنطق المهام والتكرار والأولويات
│   │   └── tasks.routes.ts     # مسارات Hono API الخاصة بالمهام
│   ├── pomodoro/
│   │   ├── pomodoro.schema.ts
│   │   ├── pomodoro.service.ts # حساب جلسات التركيز وربطها بالمشاريع
│   │   └── pomodoro.routes.ts
│   ├── habits/
│   │   ├── habits.schema.ts
│   │   ├── habits.service.ts   # حساب السلاسل (Streaks) والتسجيل التلقائي/اليدوي
│   │   └── habits.routes.ts
│   └── calendar/
│       └── calendar.service.ts # تجميع المهام والعادات وجلسات التركيز في خط زمني موحد
├── app/                        # واجهات Next.js (Views: Inbox, Today, Matrix, Calendar, Habits)
└── lib/
    └── api-client.ts           # عميل Hono RPC متوافق الأنواع (hc<AppType>)
```

## 5. تصميم نموذج البيانات (Database Schema Design)

تم تصميم الجداول باستخدام [حزمة التكامل بين Drizzle ORM و Zod](https://orm.drizzle.team/docs/zod) بحيث يدعم التطبيق:
1. **المشاريع (Projects):** لتصنيف مجالات حياتك (البرمجة، اللغة الإنجليزية، العلوم الشرعية، اللغة العربية، الثقافة العامة).
2. **المهام والمهام الفرعية (Tasks & Subtasks):** عبر علاقة ذاتية (`parentId`) أو جدول عناصر القائمة الفرعية، مع دعم الأولويات الأربع الموافقة لمصفوفة أيزنهاور (`none`, `low`, `medium`, `high`).
3. **جلسات التركيز (Focus Sessions):** تدعم نمطي `pomodoro` (عد تنازلي) و `stopwatch` (عد تصاعدي كما في [إعدادات التركيز في TickTick](https://help.ticktick.com/articles/7055782010496745472))، وترتبط بكل من المهمة والمشروع لتسهيل استخراج تقارير الوقت لكل مشروع.
4. **العادات وسجلاتها (Habits & Habit Logs):** تدعم العادات ذات القيمة الثابتة (Automatic) أو المتغيرة (Manual) كما في [نظام تتبع العادات في TickTick](https://help.ticktick.com/articles/7055781805944733696).

```typescript
// src/db/schema/productivity.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod';

// 1. Enums
export const priorityEnum = pgEnum('priority', ['none', 'low', 'medium', 'high']);
export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'completed', 'archived']);
export const focusModeEnum = pgEnum('focus_mode', ['pomodoro', 'stopwatch']);
export const habitRecordTypeEnum = pgEnum('habit_record_type', ['automatic', 'manual', 'complete_all']);

// 2. Projects Table (مثلاً: البرمجة، العلوم الشرعية، الإنجليزية، العربية، الثقافة العامة)
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(), // جاهز للتوسع إلى Multi-user SaaS
  name: varchar('name', { length: 120 }).notNull(),
  color: varchar('color', { length: 20 }).default('#3B82F6').notNull(),
  icon: varchar('icon', { length: 50 }),
  targetWeeklyMinutes: integer('target_weekly_minutes').default(0), // هدف الساعات الأسبوعي للمشروع
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('projects_user_idx').on(table.userId),
]);

// 3. Tasks Table (يدعم المهام الفرعية، التقويم، ومصفوفة أيزنهاور)
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  parentTaskId: uuid('parent_task_id'), // لدعم Subtasks متداخلة
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'), // يدعم ملاحظات Markdown لكل مهمة
  priority: priorityEnum('priority').default('none').notNull(), // High=عاجل ومهم، Medium=مهم، Low=عاجل، None=غيرهما
  status: taskStatusEnum('status').default('todo').notNull(),
  estimatedPomodoros: integer('estimated_pomodoros').default(1),
  scheduledStart: timestamp('scheduled_start', { withTimezone: true }), // للعرض في التقويم (Time-blocking)
  scheduledEnd: timestamp('scheduled_end', { withTimezone: true }),
  dueDate: timestamp('due_date', { withTimezone: true }),
  recurrenceRule: varchar('recurrence_rule', { length: 150 }), // RRule للمهام المتكررة
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('tasks_user_status_idx').on(table.userId, table.status),
  index('tasks_project_idx').on(table.projectId),
  index('tasks_schedule_idx').on(table.userId, table.scheduledStart),
]);

// 4. Focus Sessions Table (Pomodoro & Stopwatch Time Tracking per Project/Task)
export const focusSessions = pgTable('focus_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  mode: focusModeEnum('mode').default('pomodoro').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  durationSeconds: integer('duration_seconds').default(0).notNull(), // يحسب فعلياً من الفرق الزمني
  isCompleted: boolean('is_completed').default(false).notNull(),
  note: text('note'), // ملاحظة سريعة بعد انتهاء جلسة التركيز
}, (table) => [
  index('focus_user_project_idx').on(table.userId, table.projectId, table.startedAt),
]);

// 5. Habits & Habit Logs (لتتبع القرآن، الرياضة، والمطالعة اليومية)
export const habits = pgTable('habits', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  recordType: habitRecordTypeEnum('record_type').default('complete_all').notNull(),
  targetValue: integer('target_value').default(1).notNull(), // مثلاً: 5 صفحات، أو 1 مرة يومياً
  unit: varchar('unit', { length: 30 }).default('session'), // صفحة، دقيقة، كأس، ورد
  frequencyDays: varchar('frequency_days', { length: 30 }).default('1,2,3,4,5,6,7').notNull(),
  reminderTimes: text('reminder_times'), // JSON array مثل ["06:00", "20:00"]
  showInCalendar: boolean('show_in_calendar').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const habitLogs = pgTable('habit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  habitId: uuid('habit_id').references(() => habits.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').notNull(),
  logDate: date('log_date').notNull(), // YYYY-MM-DD لمنع تكرار سجل نفس اليوم
  completedValue: integer('completed_value').default(1).notNull(),
  moodScore: integer('mood_score'), // 1-5 لتقييم الشعور كما في سجل عادات TickTick
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('habit_logs_date_idx').on(table.userId, table.logDate),
]);

// توليد مخططات التحقق Zod مباشرة من الجداول
export const insertTaskSchema = createInsertSchema(tasks);
export const selectTaskSchema = createSelectSchema(tasks);
export const insertFocusSessionSchema = createInsertSchema(focusSessions);
```

## 6. تصميم منطق البومودورو وحساب الوقت (Edge Cases & Reliability)

### المشكلة الهندسية في مؤقتات الويب (Why Simple `setInterval` Fails)

لو اعتمدت على `setInterval` فقط داخل المتصفح لإنقاص ثانية كل 1000 ملي ثانية، فبمجرد أن ينتقل المستخدم إلى تبويب آخر (أثناء كتابة الكود في VS Code أو قراءة كتاب)، تقوم المتصفحات الحديثة بإبطاء التبويبات الخلفية (Background Tab Throttling)، مما يجعل جلسة الـ 25 دقيقة تستغرق 40 دقيقة بالخطأ!

### الحل الهندسي المعتمد على الطوابع الزمنية (Timestamp-Delta Pattern)

1. عند بدء الجلسة، نسجل `startedAt` في قاعدة البيانات (أو `localStorage` مع مزامنة فورية) ونحدد `expectedEndAt = startedAt + 25 minutes`.
2. في الواجهة الأمامية، يحسب العداد الوقت المتبقي عبر المعادلة: `remaining = Math.max(0, expectedEndAt - Date.now())`.
3. عند إغلاق الصفحة أو انقطاع الإنترنت، تظل الجلسة محفوظة؛ وبمجرد عودة المستخدم، يستأنف المؤقت من اللحظة الحقيقية الصحيحة دون ضياع ثانية واحدة.

```typescript
// src/modules/pomodoro/pomodoro.service.ts
// دالة نقية لحساب حالة جلسة التركيز وتحديث إحصائيات المشروع
export interface ActiveTimerState {
  startedAtMs: number;
  targetDurationSeconds: number;
  pausedAccumulatedSeconds: number;
}

export const calculateRemainingSeconds = (
  state: ActiveTimerState,
  nowMs: number = Date.now()
): number => {
  const elapsedSeconds = Math.floor((nowMs - state.startedAtMs) / 1000) - state.pausedAccumulatedSeconds;
  return Math.max(0, state.targetDurationSeconds - elapsedSeconds);
};
```

## 7. تصميم واجهات برمجة التطبيقات (Type-Safe Hono API Routes)

باستخدام [نظام التوجيه والتحقق في Hono](https://hono.dev/docs/api/routing)، نبني مسارات API نظيفة ومحمية بمخططات Zod، بحيث تحصل الواجهة الأمامية على إكمال تلقائي كامل للأنواع:

```typescript
// src/modules/pomodoro/pomodoro.routes.ts
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db';
import { focusSessions, tasks } from '../../db/schema/productivity';
import { eq, sql } from 'drizzle-orm';

const startSessionInput = z.object({
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  mode: z.enum(['pomodoro', 'stopwatch']).default('pomodoro'),
});

const completeSessionInput = z.object({
  sessionId: z.string().uuid(),
  note: z.string().max(500).optional(),
});

export const pomodoroRoutes = new Hono()
  .post('/start', async (c) => {
    const body = startSessionInput.parse(await c.req.json());
    const userId = c.get('userId'); // من طبقة Auth Middleware

    // إذا تم تمرير taskId بدون projectId، نستنتج projectId تلقائياً من المهمة
    let resolvedProjectId = body.projectId;
    if (body.taskId && !resolvedProjectId) {
      const [task] = await db
        .select({ projectId: tasks.projectId })
        .from(tasks)
        .where(eq(tasks.id, body.taskId))
        .limit(1);
      resolvedProjectId = task?.projectId ?? undefined;
    }

    const [session] = await db
      .insert(focusSessions)
      .values({
        userId,
        projectId: resolvedProjectId,
        taskId: body.taskId,
        mode: body.mode,
        startedAt: new Date(),
      })
      .returning();

    return c.json({ data: session }, 201);
  })
  .post('/complete', async (c) => {
    const body = completeSessionInput.parse(await c.req.json());
    const now = new Date();

    const [updated] = await db
      .update(focusSessions)
      .set({
        endedAt: now,
        isCompleted: true,
        note: body.note,
        durationSeconds: sql`EXTRACT(EPOCH FROM (${now} - ${focusSessions.startedAt}))::integer`,
      })
      .where(eq(focusSessions.id, body.sessionId))
      .returning();

    return c.json({ data: updated });
  });
```

## 8. تهيئة التطبيق لمشاريعك الشخصية الخمسة وعاداتك اليومية (Initial Seed Configuration)

عند تشغيل التطبيق لأول مرة، سيقوم ملف البذر (`seed.ts`) بإنشاء هيكلية مشاريعك الشخصية وعاداتك اليومية تلقائياً لتبدأ العمل فوراً:

| التصنيف في التطبيق | الاسم المقترح في قاعدة البيانات | نوع التتبع | الأولوية والجدولة المقترحة |
| :--- | :--- | :--- | :--- |
| **مشروع تركيز مكثف (Project)** | **هندسة البرمجيات وبناء التطبيقات** | مهام برمجية + مؤقت بومودورو (هدف: 15 ساعة أسبوعياً) | أولوية عالية (`High`) - فترة التركيز الصباحية أو المسائية الأولى |
| **مشروع تعلم مستمر (Project)** | **إتقان اللغة الإنجليزية** | مهام استماع ومحادثة ومفردات + بومودورو (هدف: 5 ساعات أسبوعياً) | أولوية متوسطة (`Medium`) - دمج الاستماع مع المهام اليومية |
| **مشروع تأصيل علمي (Project)** | **دراسة العلوم الشرعية** | مهام مقسمة حسب المتون والدروس + ملاحظات Markdown | أولوية متوسطة (`Medium`) - جلسات بومودورو مركزة في أوقات ثابتة |
| **مشروع إتقان لغوي (Project)** | **علوم اللغة العربية والأدب** | مهام قراءة ونحو وبلاغة + تتبع التقدم | أولوية متوسطة (`Medium`) - جدول أسبوعي منتظم |
| **مشروع إثراء معرفي (Project)** | **الثقافة العامة والقراءة الحرة** | قائمة قراءة ومقالات + مؤقت مفتوح (`Stopwatch`) | أولوية منخفضة (`Low`) - أوقات الفراغ ونهاية الأسبوع |
| **عادة يومية ثابتة (Habit)** | **الورد اليومي من القرآن الكريم** | عادة يومية (`automatic` أو `manual` بعدد الصفحات) | تذكير صباحي ومسائي ثابت يظهر في التقويم |
| **عادة يومية ثابتة (Habit)** | **التمارين الرياضية والنشاط البدني** | عادة يومية (`complete_all` أو بالدقائق) | تذكير يومي ثابت لبناء الانضباط الجسدي والذهني |

## 9. خارطة الطريق التنفيذية (Iterative Engineering Roadmap)

بدلاً من محاولة بناء كل شيء دفعة واحدة، نقسم المشروع إلى 4 مراحل هندسية متدرجة، لكل مرحلة معيار إنجاز واضح (Definition of Done):

### المرحلة الأولى: النواة الأساسية وإدارة المشاريع والمهام (الأسبوع 1 - 2)

- **الهدف الهندسي:** بناء قاعدة البيانات، إعداد Drizzle ORM و Hono، وتنفيذ عمليات CRUD للمشاريع والمهام والمهام الفرعية مع القوائم الذكية (`Inbox`, `Today`, `Next 7 Days`).
- **الأخطاء الشائعة التي يجب تجنبها:** عدم فهرسة التواريخ ومعرف المشروع، أو إهمال التحقق من المدخلات عبر Zod.
- **معيار الإنجاز (Completion Criteria):** القدرة على إضافة مشاريعك الخمسة، إنشاء مهام متداخلة بأولويات أربع، وتصفيتها في قائمة "اليوم" ومصفوفة أيزنهاور.

### المرحلة الثانية: محرك البومودورو وإحصائيات الوقت لكل مشروع (الأسبوع 3)

- **الهدف الهندسي:** بناء مؤقت البومودورو والمؤقت التصاعدي (Stopwatch) بنظام الطوابع الزمنية المقاوم لإبطاء المتصفح، وربط كل جلسة بمشروع ومهمة مع لوحة إحصائيات توضح توزيع وقتك الفعلي على كل مشروع.
- **الأخطاء الشائعة التي يجب تجنبها:** الاعتماد على عداد الواجهة فقط دون حفظ بداية الجلسة في الخادم أو التخزين المحلي.
- **معيار الإنجاز (Completion Criteria):** بدء جلسة بومودورو على مهمة في مشروع "البرمجة"، إغلاق التبويب وإعادة فتحه مع بقاء المؤقت دقيقاً، وظهور الوقت المنجز في إحصائيات المشروع.

### المرحلة الثالثة: متتبع العادات والتقويم الزمني الموحد (الأسبوع 4)

- **الهدف الهندسي:** بناء نظام العادات (القرآن والرياضة) مع حساب السلاسل المتتالية (Streaks) والخريطة الحرارية الشهرية، ودمج المهام المجدولة والعادات في تقويم تفاعلي (يومي/أسبوعي/شهري) يدعم السحب والإفلات (Time-blocking).
- **الأخطاء الشائعة التي يجب تجنبها:** خلط جدول العادات المتكررة بجدول المهام فتتضخم قاعدة البيانات بمهام يومية مكررة غير ضرورية.
- **معيار الإنجاز (Completion Criteria):** تسجيل إنجاز العادات اليومية من واجهة التقويم أو قائمة اليوم، ورؤية الخريطة الحرارية للالتزام الشهري.

### المرحلة الرابعة: التجهيز للإطلاق العام (SaaS Readiness & Polish) (الأسبوع 5 - 6)

- **الهدف الهندسي:** إضافة المصادقة المتعددة للمستخدمين، اختبارات النهاية إلى النهاية عبر [أداة Playwright للاختبار](https://playwright.dev/docs/intro)، دعم العمل دون اتصال (PWA / Offline Sync)، وإدخال المهام الذكي عبر تحليل التاريخ من النص (Smart Date Parsing).
- **معيار الإنجاز (Completion Criteria):** إمكانية تسجيل مستخدم جديد بحساب مستقل تماماً مع عزلة تامة للبيانات واجتياز جميع الاختبارات الآلية.
