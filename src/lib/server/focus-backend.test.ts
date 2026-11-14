import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

test('starting focus interrupts prior sessions and preserves elapsed duration', async () => {
  const route = await source('../../app/api/focus/start/route.ts');

  assert.match(route, /\.set\(interruptedFocusValues\(old, now\)\)/);
  assert.match(route, /actualSeconds: old\.mode === 'pomodoro' \? Math\.min\(elapsed, old\.plannedSeconds\) : elapsed/);
  assert.match(route, /isCompleted: false/);
});

test('stopwatch finish accepts durations over four hours and clamps them to wall time', async () => {
  const route = await source('../../app/api/focus/[id]/finish/route.ts');

  assert.match(route, /actualSeconds: z\.number\(\)\.int\(\)\.min\(0\)\.max\(2_147_483_647\)/);
  assert.match(route, /Math\.min\(reportedSeconds, elapsed\)/);
  assert.match(route, /existing\.isCompleted \|\| existing\.endedAt/);
  assert.match(route, /isNull\(focusSessions\.endedAt\)/);
  assert.doesNotMatch(route, /4\s*\*\s*3600/);
});

test('focus start rejects a task paired with a different project', async () => {
  const route = await source('../../app/api/focus/start/route.ts');

  assert.match(route, /task && task\.projectId !== input\.projectId/);
});

test('focus sessions have a partial unique index for active sessions', async () => {
  const schema = await source('../../db/schema.ts');

  assert.match(schema, /uniqueIndex\('focus_one_active_per_user_idx'\)/);
  assert.match(schema, /isCompleted\} = false AND \$\{table\.endedAt\} IS NULL/);
});

test('migration interrupts duplicate running sessions before creating the unique index', async () => {
  const migration = await source('../../../drizzle/0002_icy_greymalkin.sql');

  assert.match(migration, /ROW_NUMBER\(\) OVER \(PARTITION BY workspace_id, user_id/);
  assert.match(migration, /GREATEST\(0, FLOOR\(EXTRACT\(EPOCH FROM/);
  assert.match(migration, /WHEN focus\.mode = 'pomodoro' THEN LEAST\(focus\.planned_seconds, interrupted\.elapsed_seconds\)/);
  assert.ok(migration.indexOf('UPDATE focus_sessions') < migration.indexOf('CREATE UNIQUE INDEX'));
});

test('task parent updates walk ancestors and reject cycles', async () => {
  const route = await source('../../app/api/tasks/[id]/route.ts');

  assert.match(route, /WITH RECURSIVE parent_chain AS/);
  assert.match(route, /if \(createsTaskParentCycle\(taskId, ancestors\)\)/);
  assert.match(route, /ancestors\.some\(\(ancestor\) => ancestor\.id === taskId\)/);
});
