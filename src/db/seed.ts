import { db, sqlite, DEMO_USER_ID, DEMO_WORKSPACE_ID } from './index';
import { habits, memberships, projects, users, workspaces } from './schema';
import { eq } from 'drizzle-orm';

const now = new Date();
const projectsSeed = [
  { id: 'project-code', name: 'البرمجة', description: 'هندسة البرمجيات وبناء التطبيقات', color: '#5477E8', icon: 'code', targetWeeklyMinutes: 900 },
  { id: 'project-english', name: 'اللغة الإنجليزية', description: 'مفردات، استماع، ومحادثة', color: '#D69353', icon: 'languages', targetWeeklyMinutes: 300 },
  { id: 'project-islamic', name: 'العلوم الشرعية', description: 'طلب العلم ومراجعة الدروس', color: '#229789', icon: 'book-open', targetWeeklyMinutes: 300 },
  { id: 'project-arabic', name: 'اللغة العربية', description: 'النحو والبلاغة والأدب', color: '#956BC7', icon: 'feather', targetWeeklyMinutes: 240 },
  { id: 'project-culture', name: 'الثقافة العامة', description: 'قراءة واكتشافات متنوعة', color: '#CC6D78', icon: 'globe', targetWeeklyMinutes: 180 },
];

const main = async () => {
  sqlite.pragma('foreign_keys = ON');
  await db.insert(users).values({ id: DEMO_USER_ID, email: 'you@winit.local', name: 'مرحباً بك', passwordHash: 'local-demo', dailyFocusGoalMinutes: 120 }).onConflictDoNothing();
  await db.insert(workspaces).values({ id: DEMO_WORKSPACE_ID, name: 'مساحتي الشخصية', slug: 'personal', ownerId: DEMO_USER_ID, plan: 'personal' }).onConflictDoNothing();
  await db.insert(memberships).values({ id: 'membership-owner', workspaceId: DEMO_WORKSPACE_ID, userId: DEMO_USER_ID, role: 'owner' }).onConflictDoNothing();
  for (const [sortOrder, project] of projectsSeed.entries()) {
    await db.insert(projects).values({ ...project, workspaceId: DEMO_WORKSPACE_ID, createdBy: DEMO_USER_ID, sortOrder }).onConflictDoNothing();
  }
  const habitSeeds = [
    { id: 'habit-quran', name: 'ورد القرآن الكريم', description: 'قليلٌ دائم خير من كثير منقطع', icon: 'book-open', color: '#138A78', recordType: 'quantity' as const, targetValue: 5, unit: 'صفحات', reminderTime: '06:30' },
    { id: 'habit-exercise', name: 'الرياضة والحركة', description: 'خطوة صغيرة تصنع فرقاً كبيراً', icon: 'activity', color: '#D4894D', recordType: 'duration' as const, targetValue: 30, unit: 'دقيقة', reminderTime: '17:30' },
    { id: 'habit-english', name: 'ممارسة الإنجليزية', description: 'استمع، اقرأ، أو تحدث لمدة قصيرة', icon: 'languages', color: '#6D78D8', recordType: 'duration' as const, targetValue: 20, unit: 'دقيقة', reminderTime: '20:00' },
  ];
  for (const [sortOrder, habit] of habitSeeds.entries()) {
    await db.insert(habits).values({ ...habit, workspaceId: DEMO_WORKSPACE_ID, createdBy: DEMO_USER_ID, sortOrder }).onConflictDoNothing();
  }
  // Give the first visit a lively board without blocking the user from starting fresh.
  const existing = sqlite.prepare('SELECT COUNT(*) AS count FROM tasks').get() as { count: number };
  if (existing.count === 0) {
    const { tasks } = await import('./schema');
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
  console.log('Seeded Winit personal workspace.');
};

main().catch((error) => { console.error(error); process.exit(1); });
