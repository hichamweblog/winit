#!/usr/bin/env node
/**
 * Consistent SQLite backup using the online backup API, which is safe while the
 * app is writing (a plain file copy of a WAL database is not).
 *
 * Usage: npm run db:backup -- [destination-directory]
 */
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const source = process.env.DATABASE_URL?.replace(/^file:/, '') ?? path.join(process.cwd(), 'data', 'winit.db');
if (!fs.existsSync(source)) {
  console.error(`No database at ${source}`);
  process.exit(1);
}
const dir = path.resolve(process.argv[2] ?? path.join(process.cwd(), 'data', 'backups'));
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = path.join(dir, `winit-${stamp}.db`);

const db = new Database(source, { readonly: true });
try {
  await db.backup(target);
  const check = new Database(target, { readonly: true });
  const integrity = check.pragma('integrity_check', { simple: true });
  check.close();
  if (integrity !== 'ok') {
    console.error(`Backup written but integrity check returned: ${integrity}`);
    process.exit(1);
  }
  const { size } = fs.statSync(target);
  console.log(`Backup: ${target} (${(size / 1024).toFixed(1)} kB, integrity ok)`);
} finally {
  db.close();
}
