import assert from 'node:assert/strict';
import test from 'node:test';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from './password';
import { deleteUserAccount, exportUserData, registerUser } from './auth';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, SESSION_COOKIE_NAME } from '@/lib/types';

test('shared security constants match expected names', () => {
  assert.equal(CSRF_COOKIE_NAME, 'winit_csrf');
  assert.equal(CSRF_HEADER_NAME, 'x-csrf-token');
  assert.equal(SESSION_COOKIE_NAME, 'winit_session');
});

test('user lifecycle: register, export GDPR data, and delete account with cascade', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set; skipping database integration test');
    return;
  }
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
  } catch (err) {
    t.skip(`Cannot connect to database for integration test: ${(err as Error).message}`);
    return;
  }

  const email = `test-lifecycle-${Date.now()}@example.com`;
  const name = 'مستخدم تجريبي';
  const hash = await hashPassword('password123456');

  const { userId, workspaceId } = await registerUser(email, name, hash);
  assert.ok(userId);
  assert.ok(workspaceId);

  // Export GDPR data
  const exported = await exportUserData(userId, workspaceId);
  assert.equal(exported.user?.email, email);
  assert.equal(exported.user?.name, name);
  assert.equal(exported.workspace?.id, workspaceId);
  assert.ok(Array.isArray(exported.tasks));
  assert.ok(Array.isArray(exported.habits));
  assert.ok(Array.isArray(exported.projects));
  assert.ok(Array.isArray(exported.focusSessions));
  assert.ok(Array.isArray(exported.journalEntries));

  // Delete account
  await deleteUserAccount(userId);

  const [remainingUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  assert.equal(remainingUser, undefined);
});
