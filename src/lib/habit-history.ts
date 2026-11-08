/**
 * Contribution-graph maths for habit history (GitHub-style).
 *
 * Pure and date-arithmetic-only so it can be unit tested without a DOM.
 * The grid is week-columns × 7 weekday-rows, aligned to whole weeks, with the
 * weekday order driven by the workspace week start (Saturday by default, §8.7).
 */

export type Intensity = 0 | 1 | 2 | 3 | 4;

export type HistoryCell = {
  /** ISO local date key, YYYY-MM-DD */
  date: string;
  value: number;
  level: Intensity;
  /** false for the padding days that complete the first/last week */
  inRange: boolean;
  isToday: boolean;
  isFuture: boolean;
  /** 0..6, position within the week given the week start */
  weekday: number;
};

export type HistoryWeek = {
  index: number;
  cells: HistoryCell[];
  /** Arabic month name, present only on the column where that month begins */
  monthLabel: string | null;
};

export type HistoryStats = {
  activeDays: number;
  completedDays: number;
  totalDays: number;
  /** 0..100, share of in-range days that met the target */
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  totalValue: number;
};

export type ContributionGrid = {
  weeks: HistoryWeek[];
  stats: HistoryStats;
  from: string;
  to: string;
  weekdayLabels: string[];
};

export const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
] as const;

/** Saturday-first, matching getWeekStart(). */
export const AR_WEEKDAYS_SAT = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'] as const;
export const AR_WEEKDAYS_FULL_SAT = [
  'السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة',
] as const;

const key = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12);
};

const shift = (d: Date, days: number) => {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
};

/**
 * Five levels, like GitHub. Level is the fraction of the daily target met, so a
 * binary check-in habit is either empty (0) or full (4) and a quantity habit
 * shows partial effort. Colour is never the only carrier — every cell also has
 * a text label with the exact value.
 */
export function intensityLevel(value: number, target: number): Intensity {
  if (!Number.isFinite(value) || value <= 0 || target <= 0) return 0;
  const ratio = value / target;
  if (ratio >= 1) return 4;
  if (ratio >= 2 / 3) return 3;
  if (ratio >= 1 / 3) return 2;
  return 1;
}

export function computeHistoryStats(cells: HistoryCell[], target: number): HistoryStats {
  const inRange = cells.filter((c) => c.inRange && !c.isFuture);
  const completed = inRange.filter((c) => c.value >= target && target > 0);
  const active = inRange.filter((c) => c.value > 0);

  let longest = 0;
  let run = 0;
  for (const cell of inRange) {
    if (cell.value >= target && target > 0) { run += 1; longest = Math.max(longest, run); }
    else run = 0;
  }

  // A current streak may end yesterday: today is allowed to be unfinished.
  let current = 0;
  for (let i = inRange.length - 1; i >= 0; i -= 1) {
    const cell = inRange[i];
    const met = cell.value >= target && target > 0;
    if (met) { current += 1; continue; }
    if (cell.isToday && current === 0) continue;
    break;
  }

  return {
    activeDays: active.length,
    completedDays: completed.length,
    totalDays: inRange.length,
    completionRate: inRange.length ? Math.round((completed.length / inRange.length) * 100) : 0,
    currentStreak: current,
    longestStreak: longest,
    totalValue: inRange.reduce((sum, c) => sum + c.value, 0),
  };
}

/**
 * Build the week-column grid.
 *
 * @param logs    sparse log rows for the range
 * @param from    first in-range date (inclusive)
 * @param to      last in-range date, normally today (inclusive)
 * @param target  daily target used for intensity and streaks
 * @param weekStartsOn  JS getDay() index; 6 = Saturday
 */
export function buildContributionGrid(
  logs: ReadonlyArray<{ date: string; value: number }>,
  options: { from: string; to: string; target: number; weekStartsOn?: number },
): ContributionGrid {
  const { from, to, target } = options;
  const weekStartsOn = options.weekStartsOn ?? 6;
  const values = new Map(logs.map((l) => [l.date, l.value]));

  const first = parse(from);
  const last = parse(to);
  const lead = (first.getDay() - weekStartsOn + 7) % 7;
  const gridStart = shift(first, -lead);
  const totalDays = Math.round((last.getTime() - gridStart.getTime()) / 86_400_000) + 1;
  const weekCount = Math.max(1, Math.ceil(totalDays / 7));

  const weeks: HistoryWeek[] = [];
  const flat: HistoryCell[] = [];
  let labelledMonth = -1;

  for (let w = 0; w < weekCount; w += 1) {
    const cells: HistoryCell[] = [];
    let monthLabel: string | null = null;
    for (let d = 0; d < 7; d += 1) {
      const day = shift(gridStart, w * 7 + d);
      const iso = key(day);
      const inRange = iso >= from && iso <= to;
      const value = values.get(iso) ?? 0;
      const cell: HistoryCell = {
        date: iso,
        value,
        level: inRange ? intensityLevel(value, target) : 0,
        inRange,
        isToday: iso === to,
        isFuture: iso > to,
        weekday: d,
      };
      cells.push(cell);
      flat.push(cell);
      // Label the column that contains the 1st of a month, once per month.
      if (inRange && day.getDate() <= 7 && day.getMonth() !== labelledMonth) {
        labelledMonth = day.getMonth();
        monthLabel = AR_MONTHS[day.getMonth()];
      }
    }
    weeks.push({ index: w, cells, monthLabel });
  }

  // The very first column always carries a label so the axis is never blank.
  if (weeks.length && !weeks.some((w) => w.monthLabel)) weeks[0].monthLabel = AR_MONTHS[first.getMonth()];

  const rotation = (weekStartsOn % 7 + 7) % 7;
  // Rotate a Sunday-first base so the row labels match the configured week start.
  const sundayFirst = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
  const rotate = <T,>(arr: readonly T[]) => Array.from({ length: 7 }, (_, i) => arr[(i + rotation) % 7]);

  return {
    weeks,
    stats: computeHistoryStats(flat, target),
    from,
    to,
    weekdayLabels: rotate(sundayFirst),
  };
}

/** Full human label for a cell — the screen-reader text. */
export function describeCell(cell: HistoryCell, target: number, unit: string): string {
  if (!cell.inRange) return '';
  const date = new Intl.DateTimeFormat('ar-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(parse(cell.date));
  if (cell.isFuture) return `${date}: لم يأتِ بعد`;
  if (cell.value <= 0) return `${date}: لا يوجد تسجيل`;
  const met = target > 0 && cell.value >= target;
  const amount = `${new Intl.NumberFormat('ar-u-nu-latn').format(cell.value)} ${unit}`.trim();
  return `${date}: ${amount}${met ? '، اكتمل الهدف' : '، تقدّم جزئي'}`;
}

/**
 * Compact label for the *visual* tooltip and readout.
 *
 * The full `describeCell` string ("الخميس، 23 يوليو 2026: 5 صفحات، اكتمل الهدف")
 * is right for a screen reader but overflows a phone screen and gets clipped.
 * This drops the weekday and year, shortens the month, and expresses progress as
 * `value/target`. The unit and the full date stay in the cell's `aria-label`, so
 * nothing is lost — only the visible string gets shorter.
 */
export function describeCellShort(cell: HistoryCell, target: number): string {
  if (!cell.inRange) return '';
  const date = new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', month: 'short' }).format(parse(cell.date));
  if (cell.isFuture) return `${date} · لم يأتِ`;
  if (cell.value <= 0) return `${date} · —`;
  const number = new Intl.NumberFormat('ar-u-nu-latn');
  const value = number.format(cell.value);
  return target > 0 ? `${date} · ${value}/${number.format(target)}` : `${date} · ${value}`;
}

/** Whether the cell met its daily target — drives the tooltip check mark. */
export function cellMetTarget(cell: HistoryCell, target: number): boolean {
  return cell.inRange && !cell.isFuture && target > 0 && cell.value >= target;
}
