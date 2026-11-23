'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Language = 'ar' | 'en';
type LocaleContextValue = { language: Language; setLanguage: (language: Language) => void; t: (arabic: string) => string };

// Small first-party dictionary for the app shell and the most-used surfaces.
// Keep source copy in Arabic so Arabic remains the default product language.
const translations: Record<string, string> = {
  'اليوم': 'Today', 'القادم': 'Upcoming', 'صندوق الوارد': 'Inbox', 'الوارد': 'Inbox',
  'كل المهام': 'All tasks', 'المهام': 'Tasks', 'التقويم': 'Calendar', 'العادات': 'Habits',
  'عاداتي': 'My habits', 'اليوميات': 'Journal', 'إحصائيات': 'Statistics', 'الإعدادات': 'Settings',
  'المشاريع': 'Projects', 'المزيد': 'More', 'المظهر': 'Appearance', 'التركيز': 'Focus',
  'شريط الهاتف': 'Mobile navigation', 'الحساب': 'Account', 'اللغة': 'Language', 'التطبيق': 'App',
  'كل تفضيلات التطبيق في مكان واحد. التغييرات تُحفظ فورًا.': 'Your preferences in one place. Changes are saved automatically.',
  'إعدادات اللغة': 'Language', 'اختر لغة واجهة التطبيق.': 'Choose the language used throughout the interface.',
  'العربية': 'Arabic', 'الإنجليزية': 'English',
  'المظهر الداكن': 'Dark appearance', 'يتبع تفضيل نظامك عند أول زيارة، ثم يحفظ اختيارك.': 'Follows your system preference on your first visit, then remembers your choice.',
  'مدة جلسة التركيز': 'Focus session length', 'المدة الافتراضية عند بدء جلسة بومودورو.': 'Default duration for a new Pomodoro session.',
  'مدة جلسة التركيز بالدقائق': 'Focus session length in minutes',
  'المدة الحالية': 'Current duration:', 'دقيقة. اختر إحدى المدد أعلاه لتغييرها.': 'minutes. Choose one of the options above to change it.',
  'اختر حتى أربعة أقسام تظهر بجانب «المزيد» في أسفل الشاشة.': 'Choose up to four sections to show beside More in the bottom bar.',
  'أقسام شريط الهاتف': 'Mobile navigation sections', 'أقسام': 'sections',
  'مساحة تجريبية مشتركة — البيانات غير خاصة.': 'Shared demo workspace — data is not private.',
  'تجريبي': 'Demo', 'خاص': 'Personal', 'تسجيل الخروج': 'Sign out',
  'سيُطلب منك تسجيل الدخول في المرة القادمة.': 'You will be asked to sign in next time.',
  'جارٍ الخروج…': 'Signing out…', 'تصدير البيانات': 'Export data',
  'تنزيل نسخة كاملة من بياناتك بصيغة JSON (متوافق مع GDPR).': 'Download a complete JSON copy of your data.',
  'تصدير JSON': 'Export JSON', 'حذف الحساب': 'Delete account',
  'حذف حسابك نهائياً وكافة بياناتك ومساحتك دون إمكانية استرجاع.': 'Permanently delete your account and all its data. This cannot be undone.',
  'لا توجد جلسة نشطة.': 'No active account session.',
  'ثبّت Winit على جهازك': 'Install Winit on your device',
  'أضف Winit إلى شاشتك الرئيسية لفتح أسرع وتجربة مستقلة عن المتصفح.': 'Add Winit to your home screen for quick access and a focused, app-like experience.',
  'تثبيت التطبيق': 'Install app', 'التطبيق مثبت': 'App installed',
  'للتثبيت على iPhone أو iPad: افتح «مشاركة» ثم اختر «إضافة إلى الشاشة الرئيسية».': 'On iPhone or iPad: tap Share, then choose Add to Home Screen.',
  'يمكنك تثبيت التطبيق من قائمة المتصفح.': 'You can install the app from your browser menu.',
  'يمكنك فتح Winit من الشاشة الرئيسية كتطبيق مستقل.': 'Open Winit from your home screen as a standalone app.',
  'صباح الخير، لنصنع يوماً جميلاً.': 'Good morning. Let’s make today a good one.',
  'رتّب أفكارك، خذ نفساً عميقاً، وابدأ بما يهمّ حقاً.': 'Clear your mind, take a breath, and start with what matters.',
  'ملخص اليوم': 'Today at a glance', 'المهام المكتملة': 'Tasks completed', 'وقت التركيز': 'Focus time',
  'العادات المكتملة': 'Habits completed', 'مهام اليوم': 'Today’s tasks',
  'قائمتك هادئة الآن': 'Your list is clear for now', 'لحظة جميلة لتضيف مهمة تخدم أهدافك.': 'A good moment to add a task that moves you toward your goals.',
  'لا تبحث عن الكمال، فقط عُد كل يوم.': 'Do not aim for perfection; just show up each day.',
  'التركيز خلال الأسبوع': 'Focus this week', 'تذكير لطيف: الثبات أجمل من السرعة.': 'A gentle reminder: consistency matters more than speed.',
  'من': 'of', 'أضف مهمة جديدة': 'Add a new task', 'افتح القائمة': 'Open menu', 'إغلاق القائمة': 'Close menu',
  'القائمة الرئيسية': 'Main menu', 'التنقل بين الصفحات': 'Page navigation', 'قائمة المشاريع': 'Project list',
  'إضافة مشروع': 'Add project', 'المزيد من القوائم': 'More lists', 'التنقل الرئيسي': 'Main navigation',
  'التبديل إلى المظهر الفاتح': 'Switch to light appearance', 'التبديل إلى المظهر الداكن': 'Switch to dark appearance',
  'مصمّم لأيامك، لا لمزيد من الضجيج.': 'Designed for your days, not more noise.',
  'أنجز ما يهمّك': 'Make time for what matters', 'مساحة تجريبية': 'Demo workspace', 'حسابي': 'My account',
  'مشتركة، غير خاصة': 'Shared, not private', 'نسخة خاصة بك': 'Your personal workspace', 'الموافق': '· Hijri date',
  'تعذر فتح مساحتك.': 'Could not open your workspace.', 'أعد المحاولة': 'Try again', 'جارٍ تحميل مساحة العمل': 'Loading workspace',
  'خطوة صغيرة كل يوم تصنع طريقاً عظيماً.': 'Small steps every day build a meaningful path.',
  'استمر، أنت في الطريق الصحيح': 'Keep going. You are on the right path.',
  'متأخرة': 'Overdue', 'بلا موعد': 'No date', 'تنتظر وقتك': 'waiting for you',
  'مساحة واضحة لما يستحق انتباهك.': 'A clear space for what deserves your attention.', 'هدف التركيز الأسبوعي:': 'Weekly focus goal:',
  'مهمة جديدة': 'New task', 'لا توجد مهام هنا بعد': 'No tasks here yet',
  'أضف أول مهمة، وسنساعدك على إبقاء الصورة واضحة.': 'Add your first task and we’ll help keep things clear.', 'أضف مهمة': 'Add task',
  'دفتر اليوميات': 'Journal', 'اكتب ما تريد تذكّره، بلا ضغط ولا قالب مفروض.': 'Write what you want to remember, without pressure or a prescribed format.',
  'تدوينة جديدة': 'New entry', 'سؤال اليوم': 'Today’s prompt',
  'ما الشيء الذي تود أن تحتفظ به من هذا اليوم؟': 'What would you like to remember about today?',
  'سطر واحد يكفي. يمكنك العودة إليه متى شئت.': 'One line is enough. Come back to it whenever you like.',
  'ابدأ الكتابة': 'Start writing', 'entry': 'entry', 'entries': 'entries',
  'تكبير خط القراءة': 'Increase reading size', 'تصغير خط القراءة': 'Decrease reading size',
  'ابحث في تدويناتك': 'Search your entries', 'ابحث في التدوينات': 'Search journal entries',
  'جارٍ تحميل اليوميات': 'Loading journal', 'تدوينة يومية': 'Daily entry', 'عرض أقل': 'Show less',
  'اقرأ المزيد': 'Read more', 'آخر تعديل': 'Last edited', 'تعديل تدوينة': 'Edit entry',
  'حذف تدوينة': 'Delete entry', 'لم نعثر على تدوينة مطابقة': 'No matching entries found',
  'دفترك ما زال فارغاً': 'Your journal is still empty', 'جرّب كلمات أخرى أو امسح البحث.': 'Try different words or clear your search.',
  'ابدأ بملاحظة صغيرة عن يومك، ثم عُد إليها وقتما تشاء.': 'Start with a small note about your day, then return whenever you like.',
  'اكتب أول تدوينة': 'Write your first entry', 'جارٍ التحميل…': 'Loading…', 'تحميل تدوينات أقدم': 'Load older entries',
  'ممتن': 'Grateful', 'هادئ': 'Calm', 'متحمس': 'Energized', 'متعب': 'Tired', 'قلق': 'Anxious', 'متأمل': 'Reflective',
  'أولوية عالية': 'High priority', 'أولوية متوسطة': 'Medium priority', 'أولوية منخفضة': 'Low priority', 'بدون أولوية': 'No priority',
  'مستحقة اليوم': 'Due today', 'إلغاء إكمال': 'Uncomplete', 'إكمال': 'Complete', 'تعديل': 'Edit', 'حذف': 'Delete',
  'بدء التركيز على': 'Start focusing on', 'بدء جلسة تركيز': 'Start focus session',
  'مهمة في': 'tasks in', 'لا مهام مستحقة في': 'No tasks due in', 'اختيار يوم': 'Choose a day',
  'مهام مستحقة': 'Tasks due', 'مهام اليوم المحدد': 'Tasks for selected day', 'يوم خالٍ': 'Clear day',
  'لا مهام مستحقة. مساحة مفتوحة لما يهمّك.': 'No tasks due. Make room for what matters.',
  'تغييرات غير محفوظة': 'Unsaved changes',
  'لديك تغييرات لم تُحفظ في هذه المهمة. هل تريد إغلاق النافذة وتجاهل التعديلات؟': 'You have unsaved changes to this task. Close this dialog and discard them?',
  'تجاهل التغييرات': 'Discard changes', 'متابعة التعديل': 'Continue editing', 'تعديل المهمة': 'Edit task',
  'إغلاق': 'Close', 'عنوان المهمة': 'Task title', 'ما الذي تود إنجازه؟': 'What would you like to get done?',
  'ملاحظات المهمة': 'Task notes', 'أضف ملاحظة صغيرة تساعدك…': 'Add a helpful note…', 'المشروع': 'Project',
  'الأولوية': 'Priority', 'عالية': 'High', 'متوسطة': 'Medium', 'منخفضة': 'Low', 'تاريخ الاستحقاق': 'Due date',
  'جلسات التركيز': 'Focus sessions', 'عدد جلسات التركيز المتوقعة': 'Estimated focus sessions',
  'وسوم، مفصولة بفواصل': 'Tags, separated by commas', 'دراسة، مراجعة': 'Study, review', 'الحالة': 'Status',
  'قيد الانتظار': 'To do', 'قيد التنفيذ': 'In progress', 'مكتملة': 'Completed', 'للإغلاق': 'to close',
  'جارٍ الحفظ…': 'Saving…', 'حفظ التعديلات': 'Save changes', 'أضف إلى يومي': 'Add to my day',
  'جلسة تركيز هادئة': 'Calm focus session', 'دقيقة تركيز': 'minutes of focus', 'مؤقت مفتوح': 'Open timer',
  'بومودورو،': 'Pomodoro ·', 'دقيقة': 'minutes', 'مدة التركيز': 'Focus duration', 'على ماذا ستركز؟': 'What will you focus on?',
  'اختياري': 'optional', 'اختر مهمة أو اتركها فارغة': 'Choose a task or leave blank',
  'ابدأ التركيز': 'Start focusing', 'أغلق ما يشتت انتباهك. هذه اللحظة لك.': 'Close distractions. This moment is yours.',
  'لوحة كانبان للمشروع': 'Project Kanban board', 'Move to': 'Move to', 'Move task': 'Move task to',
  'جلسة تركيز جارية': 'Focus session in progress', 'تصغير المؤقت': 'Minimize timer', 'جلسة نشطة': 'Session active',
  'متبقي من جلسة التركيز': 'Time remaining', 'وقت التركيز المنقضي': 'Elapsed focus time',
  'تصغير إلى المؤقت المصغر': 'Minimize to compact timer', 'إنهاء الجلسة': 'Stop session', 'إكمال الجلسة': 'Complete session',
  'تكبير المؤقت': 'Expand timer', 'إنهاء': 'End', 'تركيز': 'Focus', 'جلسة تركيز مستقلة': 'Independent focus session',
  'جارٍ التحقق من الجلسة': 'Checking your session', 'وضع التجربة: مساحة مشتركة مفتوحة للجميع، وبياناتها غير خاصة.': 'Demo mode: a shared workspace visible to everyone. Data is not private.',
  'أنشئ حساباً للحصول على مساحة خاصة بك.': 'Create an account for your own workspace.', 'أهلاً بعودتك': 'Welcome back',
  'أنشئ حسابك': 'Create your account', 'سجّل الدخول لتصل إلى مهامك وعاداتك ويومياتك.': 'Sign in to access your tasks, habits, and journal.',
  'مساحة خاصة لك، مرتبطة بحسابك وحدك.': 'A personal workspace, tied to your account.', 'الاسم': 'Name', 'اسمك': 'Your name',
  'البريد الإلكتروني': 'Email address', 'كلمة المرور': 'Password', '10 أحرف على الأقل': 'At least 10 characters',
  'إخفاء كلمة المرور': 'Hide password', 'إظهار كلمة المرور': 'Show password', 'تعذر الاتصال بالخادم': 'Could not connect to the server.',
  'جارٍ التحقق…': 'Checking…', 'إنشاء الحساب': 'Create account', 'ليس لديك حساب؟ أنشئ واحداً': 'New here? Create an account',
  'لديك حساب بالفعل؟ سجّل الدخول': 'Already have an account? Sign in',
  'اسحب مهمة إلى هنا': 'Drop a task here', 'عرض مهام المشروع': 'Project task view', 'قائمة': 'List', 'لوحة': 'Board',
  'النطاق الزمني': 'Date range', 'ملخص الفترة': 'Period summary',
  'مهام أُنجزت': 'Tasks completed', 'ثبات العادات': 'Habit consistency', 'أطول سلسلة أيام': 'Longest active streak',
  'لا بيانات في هذه الفترة بعد': 'No data for this period yet',
  'أنجز مهمة أو ابدأ جلسة تركيز، وستظهر أرقامك هنا.': 'Complete a task or start a focus session, and your stats will appear here.',
  'التركيز اليومي': 'Daily focus', 'أعلى يوم:': 'Best day:', 'آخر 8 أسابيع': 'Last 8 weeks',
  'هذا الأسبوع:': 'This week:', 'الآن': 'Now', 'المهام المنجزة حسب الأولوية': 'Completed tasks by priority',
  'لا مهام منجزة في هذه الفترة.': 'No tasks completed during this period.',
  'أضف عادة لتتابع ثباتها هنا.': 'Add a habit to track your consistency here.',
  'عرض موحد': 'Combined list', 'مقسمة حسب الموعد': 'Separate by due date',
  'تعديل التدوينة': 'Edit journal entry', 'إغلاق المحرر': 'Close editor', 'عنوان اختياري': 'Optional title',
  'كلمة تلخّص يومك': 'A word to sum up your day', 'تاريخ التدوينة': 'Entry date',
  'كيف كان شعورك؟': 'How are you feeling?', 'ما الذي تود تدوينه؟': 'What would you like to write about?',
  'اكتب بحرية. لا تحتاج إلى صياغة مثالية…': 'Write freely. It does not need to be perfect…',
  'أغلق دون حفظ': 'Close without saving', 'تابع التحرير': 'Continue editing',
  'لديك تغييرات لم تُحفظ في هذه التدوينة. إن أغلقت المحرر الآن ستفقد ما كتبته.': 'You have unsaved changes in this entry. Closing now will discard what you wrote.',
  'حفظ التدوينة': 'Save entry', 'حرف': 'characters',
};

const LocaleContext = createContext<LocaleContextValue>({ language: 'ar', setLanguage: () => {}, t: (text) => text });

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ar');
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('winit-language');
      if (saved === 'ar' || saved === 'en') setLanguageState(saved);
    } catch { /* keep Arabic if storage is unavailable */ }
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dataset.language = language;
    document.title = language === 'en' ? 'Winit — Focus, habits and goals' : 'Winit — مساحتك للإنجاز';
    try { window.localStorage.setItem('winit-language', language); } catch { /* current session still works */ }
  }, [language]);
  const setLanguage = useCallback((next: Language) => setLanguageState(next), []);
  const t = useCallback((arabic: string) => language === 'en' ? translations[arabic] ?? arabic : arabic, [language]);
  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() { return useContext(LocaleContext); }
