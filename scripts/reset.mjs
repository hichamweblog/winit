#!/usr/bin/env node
/**
 * Destructive reset for local development only.
 *
 * Refuses to run when NODE_ENV=production, and otherwise requires an explicit
 * `--yes` plus a backup of the existing file, so a stray command cannot wipe
 * data without a recovery path.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to reset a production database.');
  process.exit(1);
}
if (!process.argv.includes('--yes')) {
  console.error('This deletes every row. Re-run with --yes to confirm: npm run db:reset -- --yes');
  process.exit(1);
}
const file = process.env.DATABASE_URL?.replace(/^file:/, '') ?? path.join(process.cwd(), 'data', 'winit.db');
if (fs.existsSync(file)) {
  execFileSync(process.execPath, ['scripts/backup.mjs'], { stdio: 'inherit' });
  for (const suffix of ['', '-wal', '-shm']) {
    const p = `${file}${suffix}`;
    if (fs.existsSync(p)) fs.rmSync(p);
  }
  console.log(`Removed ${file} (a backup was taken first).`);
}
execFileSync('npm', ['run', 'db:migrate'], { stdio: 'inherit' });
execFileSync('npm', ['run', 'db:seed'], { stdio: 'inherit' });
