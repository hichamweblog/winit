import { db, client, DEMO_USER_ID, DEMO_WORKSPACE_ID } from './index';
import { habits, memberships, projects, users, workspaces, tasks, habitLogs, focusSessions } from './schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Demo data for local development and previews.
 *
 * Refuses to run against a production database unless explicitly forced, so a
 * deploy pipeline can never quietly fill a real account with sample rows.
 */
if (process.env.NODE_ENV === 'production' && process.env.WINIT_ALLOW_PRODUCTION_SEED !== '1') {
  console.error('Refusing to seed a production database. Set WINIT_ALLOW_PRODUCTION_SEED=1 to override.');
  process.exit(1);
}

const now = new Date();
const projectsSeed = [
  { id: 'project-code', name: 'البرمجة', description: 'هندسة البرمجيات وبناء التطبيقات', color: '#3B6EA8', icon: 'code', targetWeeklyMinutes: 900 },
  { id: 'project-english', name: 'اللغة الإنجليزية', description: 'مفردات، استماع، ومحادثة', color: '#8B5A8C', icon: 'languages', targetWeeklyMinutes: 300 },
  { id: 'project-islamic', name: 'العلوم الشرعية', description: 'طلب العلم ومراجعة الدروس', color: '#5E7A3A', icon: 'book-open', targetWeeklyMinutes: 300 },
  { id: 'project-arabic', name: 'اللغة العربية', description: 'النحو والبلاغة والأدب', color: '#A9792B', icon: 'feather', targetWeeklyMinutes: 240 },
  { id: 'project-culture', name: 'الثقافة العامة', description: 'قراءة واكتشافات متنوعة', color: '#B8577A', icon: 'globe', targetWeeklyMinutes: 180 },
];

const main = async () => {
  await db.insert(users).values({ id: DEMO_USER_ID, email: 'you@winit.local', name: 'مرحباً بك', passwordHash: 'local-demo', dailyFocusGoalMinutes: 120 }).onConflictDoNothing();
  await db.insert(workspaces).values({ id: DEMO_WORKSPACE_ID, name: 'مساحتي الشخصية', slug: 'personal', ownerId: DEMO_USER_ID, plan: 'personal' }).onConflictDoNothing();
  await db.insert(memberships).values({ id: 'membership-owner', workspaceId: DEMO_WORKSPACE_ID, userId: DEMO_USER_ID, role: 'owner' }).onConflictDoNothing();
  for (const [sortOrder, project] of projectsSeed.entries()) {
    await db.insert(projects).values({ ...project, workspaceId: DEMO_WORKSPACE_ID, createdBy: DEMO_USER_ID, sortOrder }).onConflictDoNothing();
  }
  const habitSeeds = [
    { id: 'habit-quran', name: 'ورد القرآن الكريم', description: 'قليلٌ دائم خير من كثير منقطع', icon: 'book-open', color: '#2A7A55', recordType: 'quantity' as const, targetValue: 5, unit: 'صفحات', reminderTime: '06:30' },
    { id: 'habit-exercise', name: 'الرياضة والحركة', description: 'خطوة صغيرة تصنع فرقاً كبيراً', icon: 'activity', color: '#CF5C36', recordType: 'duration' as const, targetValue: 30, unit: 'دقيقة', reminderTime: '17:30' },
    { id: 'habit-english', name: 'ممارسة الإنجليزية', description: 'استمع، اقرأ، أو تحدث لمدة قصيرة', icon: 'languages', color: '#8B5A8C', recordType: 'duration' as const, targetValue: 20, unit: 'دقيقة', reminderTime: '20:00' },
  ];
  for (const [sortOrder, habit] of habitSeeds.entries()) {
    await db.insert(habits).values({ ...habit, workspaceId: DEMO_WORKSPACE_ID, createdBy: DEMO_USER_ID, sortOrder }).onConflictDoNothing();
  }
  // Give the first visit a lively board without blocking the user from starting fresh.
  const [taskCountRow] = await db.select({ count: sql<number>`count(*)` }).from(tasks);
  if (Number(taskCountRow?.count ?? 0) === 0) {
    const today = new Date();
    const key = (offset: number) => { const d = new Date(today); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const samples = [
      { title: 'مراجعة درس المتغيرات والدوال', projectId: 'project-code', priority: 'high' as const, dueDate: key(0), estimatedPomodoros: 2, tags: 'تعلم' },
      { title: 'الاستماع إلى بودكاست باللغة الإنجليزية', projectId: 'project-english', priority: 'medium' as const, dueDate: key(0), estimatedPomodoros: 1, tags: 'استماع' },
      { title: 'قراءة عشر صفحات من كتاب', projectId: 'project-culture', priority: 'low' as const, dueDate: key(1), estimatedPomodoros: 1, tags: 'قراءة' },
      { title: 'تلخيص الدرس الأخير', projectId: 'project-islamic', priority: 'medium' as const, dueDate: key(2), estimatedPomodoros: 2, tags: 'مراجعة' },
      { title: 'التدرب على المحادثة', projectId: 'project-english', priority: 'none' as const, dueDate: null, estimatedPomodoros: 1, tags: 'تحدث' },
      { title: 'مراجعة قاعدة نحوية', projectId: 'project-arabic', priority: 'low' as const, dueDate: null, estimatedPomodoros: 1, tags: '' },
      { title: 'ترتيب أفكار المشروع القادم', projectId: null, priority: 'none' as const, dueDate: null, estimatedPomodoros: 1, tags: '' },
    ];
    await db.insert(tasks).values(samples.map((task, sortOrder) => ({ ...task, id: `task-starter-${sortOrder + 1}`, workspaceId: DEMO_WORKSPACE_ID, status: 'todo' as const, sortOrder, createdAt: now, updatedAt: now })));
  }
  // A year of plausible habit history so the contribution graph is meaningful
  // on a fresh install instead of an empty grid. Deterministic, and skipped
  // entirely if any log already exists so re-seeding never overwrites real data.
  const [logCountRow] = await db.select({ count: sql<number>`count(*)` }).from(habitLogs);
  if (Number(logCountRow?.count ?? 0) === 0) {
    let seed = 42;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const rows: Array<typeof habitLogs.$inferInsert> = [];
    for (const habit of habitSeeds) {
      for (let i = 0; i < 364; i += 1) {
        const day = new Date(today);
        day.setDate(day.getDate() - i);
        // Recent months are denser than older ones, so progress is visible.
        if (rnd() > 0.35 + 0.5 * (1 - i / 364)) continue;
        const met = rnd() > 0.3;
        const value = met ? habit.targetValue : Math.max(1, Math.round(habit.targetValue * (0.2 + rnd() * 0.6)));
        rows.push({
          id: `log-${habit.id}-${i}`,
          habitId: habit.id,
          workspaceId: DEMO_WORKSPACE_ID,
          userId: DEMO_USER_ID,
          logDate: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`,
          value,
        });
      }
    }
    if (rows.length) await db.insert(habitLogs).values(rows).onConflictDoNothing();
    console.log(`Seeded ${rows.length} demo habit log(s) across the last year.`);
  }
  // Focus history and completed tasks, so the statistics section has something
  // truthful to chart on a fresh install. Deterministic, and skipped if any
  // session already exists so re-seeding never overwrites real work.
  const [sessionCountRow] = await db.select({ count: sql<number>`count(*)` }).from(focusSessions);
  if (Number(sessionCountRow?.count ?? 0) === 0) {
    let seed = 1337;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const base = new Date();
    base.setHours(12, 0, 0, 0);
    const dayKey = (offset: number) => {
      const d = new Date(base);
      d.setDate(d.getDate() - offset);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const sessions: Array<typeof focusSessions.$inferInsert> = [];
    const done: Array<typeof tasks.$inferInsert> = [];
    const titles = [
      'مراجعة الدرس', 'تلخيص الفصل', 'تمارين عملية',
      'قراءة مركزة', 'مراجعة المفردات', 'تحضير الدرس القادم',
    ];
    const priorities = ['high', 'medium', 'low', 'none'] as const;
    for (let i = 0; i < 120; i += 1) {
      const day = dayKey(i);
      // Rest days exist; recent weeks are busier than older ones.
      const busy = rnd() > 0.25 + 0.35 * (i / 120);
      if (!busy) continue;
      const perDay = 1 + Math.floor(rnd() * 4);
      for (let k = 0; k < perDay; k += 1) {
        const started = new Date(`${day}T${String(8 + k * 2).padStart(2, '0')}:15:00`);
        const planned = [1500, 2700, 3600][Math.floor(rnd() * 3)];
        const completed = rnd() > 0.15;
        const actual = completed ? planned : Math.round(planned * (0.2 + rnd() * 0.5));
        const project = projectsSeed[Math.floor(rnd() * projectsSeed.length)];
        sessions.push({
          id: `session-seed-${i}-${k}`, workspaceId: DEMO_WORKSPACE_ID, userId: DEMO_USER_ID,
          projectId: project.id, taskId: null, mode: 'pomodoro', plannedSeconds: planned,
          actualSeconds: actual, startedAt: started, endedAt: new Date(started.getTime() + actual * 1000),
          isCompleted: completed,
        });
        if (completed && rnd() > 0.35) {
          done.push({
            id: `task-done-${i}-${k}`, workspaceId: DEMO_WORKSPACE_ID, projectId: project.id,
            title: `${titles[Math.floor(rnd() * titles.length)]} — ${day}`,
            priority: priorities[Math.floor(rnd() * priorities.length)], status: 'completed',
            dueDate: day, estimatedPomodoros: 1 + Math.floor(rnd() * 3), tags: '',
            sortOrder: 100 + i, createdAt: new Date(`${day}T07:00:00`), updatedAt: started,
            completedAt: new Date(started.getTime() + actual * 1000),
          });
        }
      }
    }
    if (sessions.length) await db.insert(focusSessions).values(sessions).onConflictDoNothing();
    if (done.length) await db.insert(tasks).values(done).onConflictDoNothing();
    console.log(`Seeded ${sessions.length} focus session(s) and ${done.length} completed task(s) across 120 days.`);
  }
  console.log('Seeded Winit personal workspace.');
};

main().catch((error) => { console.error(error); process.exit(1); });
