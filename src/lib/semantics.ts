/**
 * Visual semantics — meaning carried by an icon and a colour, not by a word.
 *
 * The app is used mostly on a phone, where a row of Arabic labels ("متوسطة"،
 * "جلسات") costs width and reading time for information a coloured flag already
 * conveys. The words are kept here, but only as accessible names: a sighted user
 * sees the flag, a screen-reader user hears "أولوية عالية".
 *
 * React-free so it can be unit tested and shared with the server if needed.
 */

export type Priority = 'none' | 'low' | 'medium' | 'high';

export type PrioritySemantics = {
  id: Priority;
  /** Accessible name only — never rendered as visible text. */
  label: string;
  /** Semantic colour token; resolves per theme. */
  color: string;
  /** Higher sorts first. */
  rank: number;
};

/**
 * Colour is never the only carrier (§10): the flag also differs by fill, and
 * every instance carries `aria-label`. `none` renders no flag at all.
 */
export const PRIORITIES: Record<Priority, PrioritySemantics> = {
  high: { id: 'high', label: 'أولوية عالية', color: 'var(--danger)', rank: 0 },
  medium: { id: 'medium', label: 'أولوية متوسطة', color: 'var(--warning)', rank: 1 },
  low: { id: 'low', label: 'أولوية منخفضة', color: 'var(--info)', rank: 2 },
  none: { id: 'none', label: 'بدون أولوية', color: 'var(--text-disabled)', rank: 3 },
};

export const PRIORITY_IDS: readonly Priority[] = ['none', 'low', 'medium', 'high'];

export function prioritySemantics(value: string | null | undefined): PrioritySemantics {
  return PRIORITIES[(value as Priority) in PRIORITIES ? (value as Priority) : 'none'];
}

/** Accessible name for a session count, with correct Arabic pluralisation. */
export function sessionsLabel(count: number): string {
  if (count === 1) return 'جلسة تركيز واحدة';
  if (count === 2) return 'جلستا تركيز';
  if (count >= 3 && count <= 10) return `${count} جلسات تركيز`;
  return `${count} جلسة تركيز`;
}

/** Accessible name for a task count. */
export function tasksLabel(count: number): string {
  if (count === 0) return 'لا مهام';
  if (count === 1) return 'مهمة واحدة';
  if (count === 2) return 'مهمتان';
  if (count >= 3 && count <= 10) return `${count} مهام`;
  return `${count} مهمة`;
}
