/**
 * Project icon catalogue — the single source of truth for the picker.
 *
 * This module is deliberately React-free so the server DTO can derive its enum
 * from the same list the UI renders. Adding an icon here without a label (or
 * without a component in src/app/project-icons.tsx) fails the tests/gate rather
 * than silently rendering a fallback folder.
 *
 * `icon` is a plain TEXT column in SQLite, so extending this list needs no
 * migration. Unknown legacy values still render via the folder fallback.
 */

export const PROJECT_ICON_IDS = [
  // Original six — kept first and unchanged so existing projects keep meanings.
  'code', 'languages', 'book-open', 'feather', 'globe', 'folder',
  // Work & study
  'briefcase', 'school', 'brain', 'flask', 'notes', 'bulb',
  // Faith, health & sport
  'mosque', 'heart', 'barbell',
  // Creative
  'palette', 'music', 'camera',
  // Life
  'coin', 'rocket', 'users', 'home', 'plane', 'plant',
] as const;

export type ProjectIconId = (typeof PROJECT_ICON_IDS)[number];

/** Arabic labels, used for the radio aria-label and the tooltip. */
export const PROJECT_ICON_LABELS: Record<ProjectIconId, string> = {
  code: 'برمجة',
  languages: 'لغات',
  'book-open': 'قراءة',
  feather: 'كتابة',
  globe: 'ثقافة',
  folder: 'عام',
  briefcase: 'عمل',
  school: 'دراسة',
  brain: 'مهارات',
  flask: 'علوم',
  notes: 'ملاحظات',
  bulb: 'أفكار',
  mosque: 'عبادة',
  heart: 'صحة',
  barbell: 'رياضة',
  palette: 'فن',
  music: 'صوتيات',
  camera: 'تصوير',
  coin: 'مال',
  rocket: 'مشاريع',
  users: 'فريق',
  home: 'منزل',
  plane: 'سفر',
  plant: 'طبيعة',
};

/**
 * Visual groups for the picker. Every id appears exactly once; a test asserts
 * the union matches PROJECT_ICON_IDS so a new icon cannot be orphaned.
 */
export const PROJECT_ICON_GROUPS: ReadonlyArray<{ label: string; ids: readonly ProjectIconId[] }> = [
  { label: 'الأساسية', ids: ['code', 'languages', 'book-open', 'feather', 'globe', 'folder'] },
  { label: 'العمل والدراسة', ids: ['briefcase', 'school', 'brain', 'flask', 'notes', 'bulb'] },
  { label: 'العبادة والصحة', ids: ['mosque', 'heart', 'barbell'] },
  { label: 'الإبداع', ids: ['palette', 'music', 'camera'] },
  { label: 'الحياة', ids: ['coin', 'rocket', 'users', 'home', 'plane', 'plant'] },
];

export const DEFAULT_PROJECT_ICON: ProjectIconId = 'folder';

export function isProjectIcon(value: string): value is ProjectIconId {
  return (PROJECT_ICON_IDS as readonly string[]).includes(value);
}
