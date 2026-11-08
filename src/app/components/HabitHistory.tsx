'use client';

/**
 * Habit contribution graph — GitHub-style history for a single habit.
 *
 * Layout: 7 weekday rows × N week columns, oldest week at the inline-start
 * (the right edge in RTL, so time flows right-to-left with Arabic reading order).
 * Five intensity levels driven by the share of the daily target met.
 *
 * Accessibility: a real ARIA grid with roving tabindex and arrow-key navigation,
 * an exact text label on every cell, a live readout, and a summary. Colour is
 * never the only carrier of meaning (§10).
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Flame } from '../icons';
import {
  buildContributionGrid,
  cellMetTarget,
  describeCell,
  describeCellShort,
  type ContributionGrid,
  type HistoryCell,
} from '@/lib/habit-history';
import { AR_LOCALE, formatArNumber } from '@/lib/core';
import { goalStyle } from '@/lib/goals';
import { api } from '@/lib/client-api';

type Range = { id: string; label: string; days: number };
const RANGES: Range[] = [
  // A single month at a readable scale: fewer columns, so the cells grow and
  // carry their day number (see `[data-view="month"]` in globals.css).
  { id: '1m', label: 'شهر', days: 30 },
  { id: '3m', label: '3 أشهر', days: 91 },
  { id: '6m', label: '6 أشهر', days: 182 },
  { id: '12m', label: 'سنة', days: 364 },
];

type Payload = {
  habitId: string;
  from: string;
  to: string;
  targetValue: number;
  unit: string;
  logs: Array<{ date: string; value: number }>;
};

/** Survives view switches so navigating away and back does not refetch. */
const cache = new Map<string, Payload>();

export default function HabitHistory({
  habitId,
  habitName,
  color,
  unit,
}: {
  habitId: string;
  habitName: string;
  color: string;
  unit: string;
}) {
  const [rangeId, setRangeId] = useState('6m');
  const range = RANGES.find((r) => r.id === rangeId) ?? RANGES[1];
  const cacheKey = `${habitId}:${range.days}`;

  const [payload, setPayload] = useState<Payload | null>(() => cache.get(cacheKey) ?? null);
  const [loading, setLoading] = useState(!cache.has(cacheKey));
  const [failed, setFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [cursor, setCursor] = useState<{ row: number; col: number } | null>(null);
  const [readout, setReadout] = useState<string | null>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number; met: boolean } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [tipShift, setTipShift] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hit = cache.get(cacheKey);
    if (hit && reloadToken === 0) { setPayload(hit); setLoading(false); setFailed(false); return; }
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    api<Payload>(`/api/habits/${habitId}/history?days=${range.days}`, { signal: controller.signal })
      .then((data) => { cache.set(cacheKey, data); setPayload(data); setLoading(false); })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        console.error('habit history:', cause);
        setFailed(true);
        setLoading(false);
      });
    return () => controller.abort();
  }, [habitId, cacheKey, range.days, reloadToken]);

  const retry = useCallback(() => {
    cache.delete(cacheKey);
    setReloadToken((n) => n + 1);
  }, [cacheKey]);

  const grid: ContributionGrid | null = useMemo(() => {
    if (!payload) return null;
    return buildContributionGrid(payload.logs, {
      from: payload.from,
      to: payload.to,
      target: payload.targetValue,
    });
  }, [payload]);

  const weekCount = grid?.weeks.length ?? 0;

  // Open on the most recent weeks. In RTL the newest column is at the far left,
  // which is the *end* of the scroll range, so the browser's default position
  // would otherwise show the oldest months first.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !grid) return;
    const overflow = el.scrollWidth - el.clientWidth;
    if (overflow <= 0) return;
    const rtl = getComputedStyle(el).direction === 'rtl';
    // Chromium/WebKit report negative scrollLeft in RTL; Firefox uses positive.
    const negativeRtl = el.scrollLeft <= 0;
    el.scrollLeft = rtl ? (negativeRtl ? -overflow : overflow) : overflow;
  }, [grid, rangeId]);

  const cellAt = useCallback(
    (row: number, col: number): HistoryCell | null => grid?.weeks[col]?.cells[row] ?? null,
    [grid],
  );

  const announce = useCallback((cell: HistoryCell | null) => {
    if (!cell || !cell.inRange || !payload) { setReadout(null); setTip(null); return; }
    const text = describeCellShort(cell, payload.targetValue);
    setReadout(text);
    return text;
  }, [payload]);

  const showTip = useCallback((element: HTMLElement | null, cell: HistoryCell | null) => {
    const text = announce(cell);
    if (!element || !text) { setTip(null); return; }
    const rect = element.getBoundingClientRect();
    // Fixed positioning uses viewport coordinates, so these are geometry, not
    // layout direction — the RTL flow is handled by the grid itself.
    setTip({ text, x: rect.left + rect.width / 2, y: rect.top, met: cell ? cellMetTarget(cell, payload?.targetValue ?? 0) : false });
  }, [announce, payload]);

  useLayoutEffect(() => {
    const node = tipRef.current;
    if (!node || !tip) { setTipShift(0); return; }
    const half = node.getBoundingClientRect().width / 2;
    const margin = 8;
    const min = half + margin;
    const max = window.innerWidth - half - margin;
    // On a viewport narrower than the tooltip there is no valid centre; pin to
    // the middle and let max-inline-size shrink the box instead.
    const clamped = max < min ? window.innerWidth / 2 : Math.min(Math.max(tip.x, min), max);
    setTipShift(clamped - tip.x);
  }, [tip]);

  const move = useCallback((row: number, col: number) => {
    if (!grid) return;
    const nextRow = Math.min(6, Math.max(0, row));
    const nextCol = Math.min(weekCount - 1, Math.max(0, col));
    setCursor({ row: nextRow, col: nextCol });
    const node = gridRef.current?.querySelector<HTMLElement>(`[data-row="${nextRow}"][data-col="${nextCol}"]`);
    node?.focus();
  }, [grid, weekCount]);

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!grid || !cursor) return;
    const { row, col } = cursor;
    // RTL: the right arrow walks back toward older weeks.
    const keys: Record<string, [number, number]> = {
      ArrowRight: [row, col - 1],
      ArrowLeft: [row, col + 1],
      ArrowUp: [row - 1, col],
      ArrowDown: [row + 1, col],
      Home: [row, 0],
      End: [row, weekCount - 1],
      PageUp: [0, col],
      PageDown: [6, col],
    };
    const target = keys[event.key];
    if (!target) return;
    event.preventDefault();
    move(target[0], target[1]);
  }, [grid, cursor, weekCount, move]);

  const solid = goalStyle(color).solid;
  const summary = grid
    ? `سجل ${habitName}: ${formatArNumber(grid.stats.completedDays)} يوماً مكتملاً من ${formatArNumber(grid.stats.totalDays)} يوماً، بنسبة ${formatArNumber(grid.stats.completionRate)}%، وأطول سلسلة ${formatArNumber(grid.stats.longestStreak)} يوماً.`
    : `سجل ${habitName}`;

  return (
    <section className="contrib" data-view={rangeId === '1m' ? 'month' : undefined} style={{ '--contrib-goal': solid } as React.CSSProperties}>
      <div className="contrib__head">
        <h4 className="contrib__title">
          {grid ? `${formatArNumber(grid.stats.completedDays)} يوماً مكتملاً` : 'السجل'}
          <span className="contrib__sub"> خلال {range.label}</span>
        </h4>
        <div className="contrib__ranges" role="group" aria-label="نطاق السجل">
          {RANGES.map((option) => (
            <button
              key={option.id}
              type="button"
              className="contrib__range"
              aria-pressed={option.id === rangeId}
              onClick={() => { setRangeId(option.id); setCursor(null); setReadout(null); setTip(null); }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="contrib__skeleton" role="status" aria-label="جارٍ تحميل السجل" />}

      {failed && !loading && (
        <p className="contrib__error" role="alert">
          <AlertTriangle size={16} /> تعذر تحميل السجل.
          <button type="button" className="ghost-button" onClick={retry}>إعادة المحاولة</button>
        </p>
      )}

      {grid && !loading && (
        <>
          <div className="contrib__scroll" ref={scrollRef}>
            <div className="contrib__frame" style={{ '--contrib-weeks': weekCount } as React.CSSProperties}>
              <div className="contrib__months" aria-hidden="true">
                {grid.weeks.map((week) => (
                  <span key={week.index} className="contrib__month">{week.monthLabel ?? ''}</span>
                ))}
              </div>
              <div className="contrib__body">
                <div className="contrib__weekdays" aria-hidden="true">
                  {grid.weekdayLabels.map((label, index) => (
                    <span key={index} className="contrib__weekday">{rangeId === '1m' || index % 2 === 0 ? label : ''}</span>
                  ))}
                </div>
                <div
                  ref={gridRef}
                  className="contrib__grid"
                  role="grid"
                  aria-label={summary}
                  aria-rowcount={7}
                  aria-colcount={weekCount}
                  onKeyDown={onKeyDown}
                  onMouseLeave={() => { setTip(null); setReadout(null); }}
                >
                  {Array.from({ length: 7 }, (_, row) => (
                    <div key={row} role="row" className="contrib__row">
                      {grid.weeks.map((week, col) => {
                        const cell = week.cells[row];
                        const active = cursor ? cursor.row === row && cursor.col === col : row === 0 && col === weekCount - 1;
                        const label = cell.inRange ? describeCell(cell, payload!.targetValue, payload!.unit || unit) : undefined;
                        return (
                          <div
                            key={cell.date}
                            role="gridcell"
                            className="contrib__cell"
                            data-level={cell.inRange ? cell.level : undefined}
                            data-padding={cell.inRange ? undefined : 'true'}
                            data-today={cell.isToday && cell.inRange ? 'true' : undefined}
                            data-row={row}
                            data-col={col}
                            aria-label={label}
                            title={label}
                            aria-disabled={!cell.inRange || undefined}
                            tabIndex={cell.inRange && active ? 0 : -1}
                            onFocus={(event) => { setCursor({ row, col }); showTip(event.currentTarget, cell); }}
                            onBlur={() => setTip(null)}
                            onMouseEnter={(event) => showTip(event.currentTarget, cell)}
                          >{rangeId === '1m' && cell.inRange ? <span className="contrib__daynum" aria-hidden="true">{formatArNumber(Number(cell.date.slice(8, 10)))}</span> : null}</div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="contrib__foot">
            <div className="contrib__legend" aria-hidden="true">
              <span>أقل</span>
              {[0, 1, 2, 3, 4].map((level) => (
                <i key={level} className="contrib__cell contrib__cell--static" data-level={level} />
              ))}
              <span>أكثر</span>
            </div>
            <p className="contrib__readout" role="status" aria-live="polite">
              {readout ?? `أطول سلسلة: ${formatArNumber(grid.stats.longestStreak)} يوماً`}
            </p>
          </div>

          <dl className="contrib__stats">
            <div>
              <dt>أيام مكتملة</dt>
              <dd>{formatArNumber(grid.stats.completedDays)}</dd>
            </div>
            <div>
              <dt>نسبة الإنجاز</dt>
              <dd><bdi>{formatArNumber(grid.stats.completionRate)}%</bdi></dd>
            </div>
            <div>
              <dt>السلسلة الحالية</dt>
              <dd>
                {grid.stats.currentStreak >= 3 && <Flame size={14} className="streak-flame" />}
                {formatArNumber(grid.stats.currentStreak)}
              </dd>
            </div>
            <div>
              <dt>أطول سلسلة</dt>
              <dd>{formatArNumber(grid.stats.longestStreak)}</dd>
            </div>
          </dl>
        </>
      )}

      {tip && (
        <div
          ref={tipRef}
          className="contrib__tip"
          role="presentation"
          style={{ left: `${tip.x + tipShift}px`, top: `${tip.y}px` }}
        >
          {tip.met && <Check size={12} aria-hidden="true" />}
          <bdi>{tip.text}</bdi>
        </div>
      )}
    </section>
  );
}

/** Exported for tests/storybook: the range presets are part of the component API. */
export { RANGES as HISTORY_RANGES };
export const historyLocale = AR_LOCALE;
