#!/usr/bin/env node
/**
 * Removes browser/API test leftovers from the DEMO workspace.
 *
 * The preview database accumulates rows created by the review probes and by any
 * `api-smoke` run accidentally pointed at the demo port: tasks called "x",
 * "no csrf", "bad csrf", habits called "عادة", duplicate reading-card journal
 * entries, and stray "مشروع أليس" projects. They make the preview look broken.
 *
 * This is NOT a reset. Seeded rows and anything a person plausibly wrote are
 * kept: only ids outside the seed prefixes AND whose content matches a known
 * test pattern are removed. Guards mirror scripts/reset.mjs — refuses
 * production, requires --yes, and takes a backup first.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

if (process.env.NODE_ENV === 'production' && process.env.WINIT_ALLOW_PRODUCTION_SEED !== '1') {
  console.error('Refusing to clean a production database.');
  process.exit(1);
}
if (!process.argv.includes('--yes')) {
  console.error('This deletes test rows. Re-run with --yes: npm run db:clean-demo -- --yes');
  process.exit(1);
}

const file = process.env.DATABASE_URL?.replace(/^file:/, '') ?? path.join(process.cwd(), 'data', 'winit.db');
if (!fs.existsSync(file)) {
  console.error(`No database at ${file}.`);
  process.exit(1);
}

const WORKSPACE = 'workspace_personal';
/** Content the probes are known to create. Anything else is left alone. */
const TEST_TITLES = new Set(['x', 'no csrf', 'bad csrf', 'proxied', 'مهمة اختبار', 'مهمة لفحص التأكيد', 'اختبار بطاقة القراءة']);
const TEST_NAMES = new Set(['مشروع أليس', 'عادة', 'أيقونة جديدة', 'عادة جديدة', 'قديمة']);
const SEED_PREFIX = /^(task-starter-|task-done-|session-seed-|log-|project-|habit-|membership-)/;

execFileSync(process.execPath, ['scripts/backup.mjs'], { stdio: 'inherit' });

const db = new Database(file);
db.pragma('foreign_keys = ON');
const report = [];

const clean = (table, column, allow, label) => {
  const rows = db.prepare(`SELECT id, ${column} AS label FROM ${table} WHERE workspace_id = ?`).all(WORKSPACE);
  const doomed = rows.filter((row) => !SEED_PREFIX.test(row.id) && allow(row.label));
  if (!doomed.length) { report.push(`${label}: nothing to remove`); return; }
  const remove = db.prepare(`DELETE FROM ${table} WHERE id = ? AND workspace_id = ?`);
  const tx = db.transaction((items) => { for (const item of items) remove.run(item.id, WORKSPACE); });
  tx(doomed);
  report.push(`${label}: removed ${doomed.length}`);
};

// Projects last: deleting one via SQL would orphan its tasks, so reassign first.
const strayProjects = db.prepare('SELECT id, name FROM projects WHERE workspace_id = ?')
  .all(WORKSPACE).filter((p) => !SEED_PREFIX.test(p.id) && TEST_NAMES.has(p.name));
if (strayProjects.length) {
  const move = db.prepare('UPDATE tasks SET project_id = NULL WHERE project_id = ? AND workspace_id = ?');
  const drop = db.prepare('DELETE FROM projects WHERE id = ? AND workspace_id = ?');
  db.transaction((items) => { for (const item of items) { move.run(item.id, WORKSPACE); drop.run(item.id, WORKSPACE); } })(strayProjects);
  report.push(`projects: removed ${strayProjects.length} (their tasks moved to the inbox)`);
} else report.push('projects: nothing to remove');

clean('tasks', 'title', (v) => TEST_TITLES.has(v), 'tasks');
clean('habits', 'name', (v) => TEST_NAMES.has(v), 'habits');
clean('journal_entries', 'COALESCE(title, \'\')', (v) => TEST_TITLES.has(v), 'journal entries');

db.close();
console.log(report.join('\n'));
console.log('A backup was taken before any deletion.');
