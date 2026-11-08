/**
 * Calm Sea goal palette — §4.3.
 *
 * The spec forbids free colour pickers: a goal gets one of the fixed slots
 * (7 named + 6 neutral from v1.0.1, plus 6 app-extension hues), and every colour is paired with its name/icon so colour is
 * never the only carrier of meaning (§10).
 *
 * The database stores a single `color` string. We keep that schema and treat the
 * LIGHT-theme solid hex as the canonical key, then resolve it to CSS custom
 * properties at render time so dark mode gets the dark variant for free.
 *
 * Audit fixes honoured here:
 *  - C8: glyphs inside a goal-coloured fill use `--on-goal`, never hardcoded
 *    white (white fails 2.14–2.64:1 on all seven dark-mode solids).
 *  - DS-07: solid goal colours are used for dots/bars/icons (>=3:1 vs surface);
 *    text on a soft goal background uses `--goal-*-fg` (>=4.5:1).
 */

export type GoalId =
  | 'code' | 'english' | 'sharia' | 'arabic' | 'culture' | 'quran' | 'sport'
  | 'neutral-1' | 'neutral-2' | 'neutral-3' | 'neutral-4' | 'neutral-5' | 'neutral-6'
  // App extension beyond the published spec — see scripts/derive-goal-colors.mjs.
  | 'teal' | 'violet' | 'crimson' | 'copper' | 'magenta' | 'lime';

export type GoalSlot = { id: GoalId; label: string; key: string };

/** Canonical picker options. `key` is the light-theme solid hex from §11.2. */
export const GOAL_SLOTS: readonly GoalSlot[] = [
  { id: 'code', label: 'البرمجة', key: '#3B6EA8' },
  { id: 'english', label: 'الإنجليزية', key: '#8B5A8C' },
  { id: 'sharia', label: 'العلوم الشرعية', key: '#5E7A3A' },
  { id: 'arabic', label: 'العربية', key: '#A9792B' },
  { id: 'culture', label: 'الثقافة العامة', key: '#B8577A' },
  { id: 'quran', label: 'القرآن', key: '#2A7A55' },
  { id: 'sport', label: 'الرياضة', key: '#CF5C36' },
  { id: 'neutral-1', label: 'رمادي أزرق', key: '#5A6B75' },
  { id: 'neutral-2', label: 'أزرق مخضر', key: '#4A6B6E' },
  { id: 'neutral-3', label: 'بني', key: '#7A5C46' },
  { id: 'neutral-4', label: 'نيلي', key: '#5C6383' },
  { id: 'neutral-5', label: 'رملي', key: '#8A7448' },
  { id: 'neutral-6', label: 'جرافيت', key: '#55595C' },
{ id: 'teal', label: 'تركوازي', key: '#0F7480' },
  { id: 'violet', label: 'بنفسجي', key: '#6A4CA3' },
  { id: 'crimson', label: 'قرمزي', key: '#A62F45' },
  { id: 'copper', label: 'نحاسي', key: '#9C5228' },
  { id: 'magenta', label: 'أرجواني', key: '#A32E93' },
  { id: 'lime', label: 'ليموني', key: '#6E8C10' },
] as const;

export const DEFAULT_GOAL_KEY = GOAL_SLOTS[0].key;

/**
 * Colours shipped by the original seed and the old free-ish picker. Mapped
 * explicitly (not by proximity) so existing rows keep their intended meaning.
 * Nothing is rewritten in the database — this is a render-time resolution.
 */
const LEGACY_GOAL_KEYS: Record<string, GoalId> = {
  '#5477e8': 'code',      // البرمجة
  '#d69353': 'english',   // اللغة الإنجليزية
  '#229789': 'sharia',    // العلوم الشرعية
  '#956bc7': 'arabic',    // اللغة العربية
  '#cc6d78': 'culture',   // الثقافة العامة
  '#138a78': 'quran',     // ورد القرآن الكريم
  '#d4894d': 'sport',     // الرياضة والحركة
  '#6d78d8': 'english',   // ممارسة الإنجليزية
  '#9b315f': 'culture',
  '#c17632': 'arabic',
  '#3f7c71': 'quran',
  '#4e69b4': 'code',
  '#8358a5': 'english',
  '#2584a7': 'neutral-2',
};

const CANONICAL = new Map(GOAL_SLOTS.map((slot) => [slot.key.toLowerCase(), slot.id]));

const toRgb = (hex: string): [number, number, number] | null => {
  const value = hex.trim().replace(/^#/, '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
};

/** Perceptually-ish weighted RGB distance; only used for unknown legacy values. */
const distance = (a: [number, number, number], b: [number, number, number]) =>
  2 * (a[0] - b[0]) ** 2 + 4 * (a[1] - b[1]) ** 2 + 3 * (a[2] - b[2]) ** 2;

/** Resolve any stored colour to one of the palette slots. */
export function resolveGoalId(color: string | null | undefined): GoalId {
  if (!color) return 'neutral-6';
  const key = color.trim().toLowerCase();
  const exact = CANONICAL.get(key) ?? LEGACY_GOAL_KEYS[key];
  if (exact) return exact;

  const rgb = toRgb(key);
  if (!rgb) return 'neutral-6';
  let best: GoalId = 'neutral-6';
  let bestScore = Number.POSITIVE_INFINITY;
  for (const slot of GOAL_SLOTS) {
    const candidate = toRgb(slot.key);
    if (!candidate) continue;
    const score = distance(rgb, candidate);
    if (score < bestScore) { bestScore = score; best = slot.id; }
  }
  return best;
}

export type GoalStyle = { solid: string; soft: string; onSoft: string; onSolid: string };

/** CSS values for a stored colour. Use `solid` for dots/bars, `onSoft` for text. */
export function goalStyle(color: string | null | undefined): GoalStyle {
  const id = resolveGoalId(color);
  return {
    solid: `var(--goal-${id})`,
    soft: `var(--goal-${id}-bg)`,
    onSoft: `var(--goal-${id}-fg)`,
    onSolid: 'var(--on-goal)', // C8 — never hardcode white
  };
}

export function goalLabel(color: string | null | undefined): string {
  const id = resolveGoalId(color);
  return GOAL_SLOTS.find((slot) => slot.id === id)?.label ?? '';
}
