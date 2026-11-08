#!/usr/bin/env node
/**
 * Production bootstrap: verify the runtime, apply migrations, and stop.
 *
 * Deliberately does NOT seed. Demo data is an explicit, separate command
 * (`npm run db:seed`) that refuses to run against a production database unless
 * forced, so a deploy can never quietly fill a real account with sample rows.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [major] = process.versions.node.split('.').map(Number);
if (major < 22) {
  console.error(`Node ${major} detected; Winit requires Node 22 or newer.`);
  process.exit(1);
}

const url = process.env.DATABASE_URL?.replace(/^file:/, '') ?? path.join(process.cwd(), 'data', 'winit.db');
fs.mkdirSync(path.dirname(path.resolve(url)), { recursive: true });

if (!fs.existsSync(path.join(process.cwd(), 'drizzle', '0000_init.sql'))) {
  console.error('No committed migrations found. Run `npm run db:generate` and commit the result.');
  process.exit(1);
}

console.log(`Applying migrations to ${url}`);
if (fs.existsSync(path.join(process.cwd(), 'scripts', 'migrate.mjs'))) {
  execFileSync(process.execPath, ['scripts/migrate.mjs'], { stdio: 'inherit' });
} else {
  execFileSync(process.execPath, ['--import', 'tsx', 'src/db/migrate.ts'], { stdio: 'inherit' });
}

if (process.env.WINIT_DEMO_MODE === '1') {
  console.warn('\n*** WINIT_DEMO_MODE=1 — anonymous visitors share one public workspace.');
  console.warn('*** Never enable this on a deployment that holds real user data.\n');
}
console.log('Bootstrap complete.');
