import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildContributionGrid, cellMetTarget, describeCell, describeCellShort, intensityLevel,
} from './habit-history';

test('intensity has five GitHub-style levels driven by share of the daily target', () => {
  assert.equal(intensityLevel(0, 5), 0);
  assert.equal(intensityLevel(-3, 5), 0);
  assert.equal(intensityLevel(1, 5), 1);   // 20%
  assert.equal(intensityLevel(2, 5), 2);   // 40%
  assert.equal(intensityLevel(4, 5), 3);   // 80%
  assert.equal(intensityLevel(5, 5), 4);   // met
  assert.equal(intensityLevel(9, 5), 4);   // over-achieving stays at max
  assert.equal(intensityLevel(1, 1), 4);   // binary check-in habit
  assert.equal(intensityLevel(5, 0), 0);   // guard against a zero target
});

test('grid is week-columns of 7 days aligned to a Saturday week start', () => {
  // 2026-11-07 is a Saturday.
  const grid = buildContributionGrid([], { from: '2026-10-01', to: '2026-11-07', target: 1 });
  assert.ok(grid.weeks.every((w) => w.cells.length === 7));
  // First column starts on the Saturday on/before 1 October (2026-09-26).
  assert.equal(grid.weeks[0].cells[0].date, '2026-09-26');
  assert.equal(grid.weeks[0].cells[0].inRange, false); // padding before `from`
  assert.equal(grid.weeks[0].cells[5].date, '2026-10-01');
  assert.equal(grid.weeks[0].cells[5].inRange, true);
  const last = grid.weeks.at(-1)!;
  assert.equal(last.cells[0].date, '2026-11-07');
  assert.equal(last.cells[0].isToday, true);
  assert.equal(last.cells[1].isFuture, true);
  assert.equal(grid.weekdayLabels[0], 'س'); // Saturday first
});

test('values land on the right date and out-of-range padding never scores', () => {
  const grid = buildContributionGrid(
    [{ date: '2026-11-05', value: 3 }, { date: '2026-11-07', value: 5 }, { date: '2026-09-01', value: 99 }],
    { from: '2026-11-01', to: '2026-11-07', target: 5 },
  );
  const cells = grid.weeks.flatMap((w) => w.cells);
  assert.equal(cells.find((c) => c.date === '2026-11-05')?.level, 2); // 3/5 = 60%
  assert.equal(cells.find((c) => c.date === '2026-11-07')?.level, 4);
  assert.equal(cells.find((c) => c.date === '2026-11-01')?.level, 0);
  assert.ok(cells.filter((c) => !c.inRange).every((c) => c.level === 0));
  assert.equal(grid.stats.totalDays, 7); // the 2026-09-01 row is outside the range
});

test('streaks: current allows an unfinished today, longest scans the whole range', () => {
  const logs = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06']
    .map((date) => ({ date, value: 1 }));
  const grid = buildContributionGrid(logs, { from: '2026-11-01', to: '2026-11-07', target: 1 });
  assert.equal(grid.stats.longestStreak, 3);
  assert.equal(grid.stats.currentStreak, 2); // 5th + 6th, today (7th) still open
  assert.equal(grid.stats.completedDays, 5);
  assert.equal(grid.stats.completionRate, 71);

  const withToday = buildContributionGrid([...logs, { date: '2026-11-07', value: 1 }],
    { from: '2026-11-01', to: '2026-11-07', target: 1 });
  assert.equal(withToday.stats.currentStreak, 3);
  assert.equal(withToday.stats.completionRate, 86);
});

test('an empty history reports zeroes instead of NaN', () => {
  const grid = buildContributionGrid([], { from: '2026-11-01', to: '2026-11-07', target: 1 });
  assert.equal(grid.stats.completedDays, 0);
  assert.equal(grid.stats.currentStreak, 0);
  assert.equal(grid.stats.longestStreak, 0);
  assert.equal(grid.stats.completionRate, 0);
});

test('month labels appear once per month and the axis is never blank', () => {
  const grid = buildContributionGrid([], { from: '2026-09-01', to: '2026-11-07', target: 1 });
  const labels = grid.weeks.map((w) => w.monthLabel).filter(Boolean);
  assert.ok(labels.length >= 2);
  assert.equal(new Set(labels).size, labels.length);
  const single = buildContributionGrid([], { from: '2026-11-02', to: '2026-11-05', target: 1 });
  assert.ok(single.weeks.some((w) => w.monthLabel));
});

test('cell descriptions carry the exact value so colour is never the only signal', () => {
  const grid = buildContributionGrid([{ date: '2026-11-05', value: 3 }],
    { from: '2026-11-01', to: '2026-11-07', target: 5 });
  const cell = grid.weeks.flatMap((w) => w.cells).find((c) => c.date === '2026-11-05')!;
  const label = describeCell(cell, 5, 'صفحات');
  assert.match(label, /3/);
  assert.match(label, /صفحات/);
  assert.match(label, /تقدّم جزئي/);
  assert.doesNotMatch(label, /[\u0660-\u0669]/); // Western digits (§2.3)
  const empty = grid.weeks.flatMap((w) => w.cells).find((c) => c.date === '2026-11-02')!;
  assert.match(describeCell(empty, 5, 'صفحات'), /لا يوجد تسجيل/);
});

/* ---- compact visual label ---------------------------------------------- */

const cell = (over: Partial<import('./habit-history').HistoryCell> = {}) => ({
  date: '2026-07-23', value: 5, level: 4 as const, inRange: true,
  isToday: false, isFuture: false, weekday: 5, ...over,
});

test('describeCellShort drops the weekday and year and shows value/target', () => {
  const short = describeCellShort(cell(), 5);
  assert.ok(short.includes('23'), short);
  assert.ok(short.includes('5/5'), short);
  assert.ok(!short.includes('2026'), `year leaked: ${short}`);
  assert.ok(!/الخميس/.test(short), `weekday leaked: ${short}`);
  assert.ok(!/صفحات/.test(short), `unit leaked: ${short}`);
});

test('the short label is materially shorter than the screen-reader label', () => {
  const short = describeCellShort(cell(), 5);
  const full = describeCell(cell(), 5, 'صفحات');
  assert.ok(short.length < full.length / 2, `${short.length} vs ${full.length}`);
  assert.ok(short.length <= 20, `still too long for a phone: ${short.length}`);
});

test('the full screen-reader label keeps the date, unit and outcome', () => {
  const full = describeCell(cell(), 5, 'صفحات');
  assert.ok(full.includes('2026'), full);
  assert.ok(full.includes('صفحات'), full);
  assert.ok(full.includes('اكتمل الهدف'), full);
});

test('short labels distinguish empty, future and partial days', () => {
  assert.match(describeCellShort(cell({ value: 0 }), 5), /—/);
  assert.match(describeCellShort(cell({ isFuture: true }), 5), /لم يأتِ/);
  assert.ok(describeCellShort(cell({ value: 2 }), 5).includes('2/5'));
});

test('out-of-range cells have no label at all', () => {
  assert.equal(describeCellShort(cell({ inRange: false }), 5), '');
});

test('short labels use Western digits', () => {
  assert.doesNotMatch(describeCellShort(cell({ value: 7 }), 10), /[\u0660-\u0669]/);
});

test('a zero target shows the raw value with no ratio', () => {
  const short = describeCellShort(cell({ value: 3 }), 0);
  assert.ok(short.includes('3'), short);
  assert.ok(!short.includes('/'), short);
});

test('cellMetTarget only fires for logged, in-range, non-future days', () => {
  assert.equal(cellMetTarget(cell(), 5), true);
  assert.equal(cellMetTarget(cell({ value: 4 }), 5), false);
  assert.equal(cellMetTarget(cell({ value: 0 }), 5), false);
  assert.equal(cellMetTarget(cell({ isFuture: true }), 5), false);
  assert.equal(cellMetTarget(cell({ inRange: false }), 5), false);
  assert.equal(cellMetTarget(cell(), 0), false);
});
