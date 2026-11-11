import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import {
  guardMutation,
  newId,
  notFound,
  queryDate,
  shiftDays,
  stamp,
} from './api-helpers';
import { ApiError } from './http';
import type { Identity } from './auth';

test('stamp and newId generate valid timestamps and UUIDs', () => {
  const s = stamp();
  assert.ok(s instanceof Date);
  assert.ok(Date.now() - s.getTime() < 5000);

  const id = newId();
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
});

test('notFound returns ApiError with Arabic label and not_found code', () => {
  const err = notFound('المهمة');
  assert.ok(err instanceof ApiError);
  assert.equal(err.status, 404);
  assert.equal(err.code, 'not_found');
  assert.equal(err.message, 'المهمة غير موجود');
});

test('queryDate validates YYYY-MM-DD format and applies fallbacks', () => {
  // Valid query date
  const req1 = new NextRequest('http://localhost:3000/api/overview?date=2026-11-15');
  assert.equal(queryDate(req1, 'date', '2026-11-01'), '2026-11-15');

  // Fallback when missing
  const req2 = new NextRequest('http://localhost:3000/api/overview');
  assert.equal(queryDate(req2, 'date', '2026-11-01'), '2026-11-01');

  // 400 when invalid
  const req3 = new NextRequest('http://localhost:3000/api/overview?date=not-a-date');
  assert.throws(() => queryDate(req3, 'date', '2026-11-01'), (err: unknown) => {
    return err instanceof ApiError && err.status === 400 && err.code === 'validation_failed';
  });
});

test('shiftDays moves calendar dates across month and year boundaries correctly', () => {
  assert.equal(shiftDays('2026-03-01', -1), '2026-02-28');
  assert.equal(shiftDays('2024-03-01', -1), '2024-02-29'); // Leap year
  assert.equal(shiftDays('2026-01-01', -1), '2025-12-31');
  assert.equal(shiftDays('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftDays('2026-05-15', 7), '2026-05-22');
});

test('guardMutation enforces same-origin and conditional CSRF', () => {
  const demoIdentity: Identity = {
    userId: 'demo-user',
    workspaceId: 'demo-ws',
    role: 'owner',
    email: 'demo@example.com',
    name: 'مستخدم تجريبي',
    demo: true,
  };

  const realIdentity: Identity = {
    userId: 'real-user',
    workspaceId: 'real-ws',
    role: 'owner',
    email: 'user@example.com',
    name: 'مستخدم حقيقي',
    demo: false,
  };

  // Demo user: no CSRF required, but same-origin is enforced
  const demoReq = new NextRequest('http://localhost:3000/api/tasks', {
    headers: { origin: 'http://localhost:3000' },
  });
  assert.doesNotThrow(() => guardMutation(demoReq, demoIdentity));

  // Real user: CSRF required
  const realReqMissingCsrf = new NextRequest('http://localhost:3000/api/tasks', {
    headers: { origin: 'http://localhost:3000' },
  });
  assert.throws(() => guardMutation(realReqMissingCsrf, realIdentity), (err: unknown) => {
    return err instanceof ApiError && err.status === 403 && err.code === 'csrf_failed';
  });
});
