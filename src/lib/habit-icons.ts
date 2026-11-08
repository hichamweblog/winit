/**
 * Habit icon catalogue — same contract as the project catalogue.
 *
 * React-free so the server DTO derives its enum from exactly the list the picker
 * renders. `icon` is a TEXT column, so adding entries needs no migration.
 * Unknown legacy values still render via a fallback and are preselected as
 * "current icon" when editing, so saving never silently rewrites them.
 */

export const HABIT_ICON_IDS = [
  // Original four — kept first and unchanged so existing habits keep meanings.
  'book-open', 'activity', 'languages', 'target',
  // Faith
  'mosque', 'moon-star', 'beads', 'heart-handshake',
  // Body & movement
  'run', 'barbell', 'walk', 'yoga', 'bike', 'swim',
  // Health & rest
  'heart', 'droplet', 'apple', 'bed', 'pill', 'sun',
  // Mind & learning
  'brain', 'school', 'feather', 'bulb', 'headphones', 'puzzle',
  // Life & craft
  'plant', 'coin', 'palette', 'music', 'camera', 'chef', 'broom', 'phone-off',
] as const;

export type HabitIconId = (typeof HABIT_ICON_IDS)[number];

/** Arabic labels — the accessible name of each picker tile. */
export const HABIT_ICON_LABELS: Record<HabitIconId, string> = {
  'book-open': 'قراءة',
  activity: 'نشاط',
  languages: 'لغات',
  target: 'هدف',
  mosque: 'مسجد',
  'moon-star': 'قيام الليل',
  beads: 'ذكر',
  'heart-handshake': 'صدقة',
  run: 'جري',
  barbell: 'قوة',
  walk: 'مشي',
  yoga: 'تمدد',
  bike: 'دراجة',
  swim: 'سباحة',
  heart: 'صحة القلب',
  droplet: 'ماء',
  apple: 'تغذية',
  bed: 'نوم',
  pill: 'دواء',
  sun: 'استيقاظ مبكر',
  brain: 'تركيز ذهني',
  school: 'دراسة',
  feather: 'كتابة',
  bulb: 'تعلم',
  headphones: 'استماع',
  puzzle: 'تحدي',
  plant: 'عناية بنبات',
  coin: 'ادخار',
  palette: 'رسم',
  music: 'موسيقى',
  camera: 'تصوير',
  chef: 'طبخ',
  broom: 'ترتيب',
  'phone-off': 'انقطاع عن الهاتف',
};

export const HABIT_ICON_GROUPS: { label: string; ids: HabitIconId[] }[] = [
  { label: 'الأساسية', ids: ['book-open', 'activity', 'languages', 'target'] },
  { label: 'العبادة', ids: ['mosque', 'moon-star', 'beads', 'heart-handshake'] },
  { label: 'الحركة', ids: ['run', 'barbell', 'walk', 'yoga', 'bike', 'swim'] },
  { label: 'الصحة والراحة', ids: ['heart', 'droplet', 'apple', 'bed', 'pill', 'sun'] },
  { label: 'العقل والتعلم', ids: ['brain', 'school', 'feather', 'bulb', 'headphones', 'puzzle'] },
  { label: 'الحياة', ids: ['plant', 'coin', 'palette', 'music', 'camera', 'chef', 'broom', 'phone-off'] },
];

export const DEFAULT_HABIT_ICON: HabitIconId = 'target';

export function isHabitIcon(value: unknown): value is HabitIconId {
  return typeof value === 'string' && (HABIT_ICON_IDS as readonly string[]).includes(value);
}
