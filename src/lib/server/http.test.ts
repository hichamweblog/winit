import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  ApiError,
  CSRF_COOKIE,
  CSRF_HEADER,
  MAX_BODY_BYTES,
  MemoryRateLimiter,
  UpstashRedisRateLimiter,
  assertCsrf,
  assertSameOrigin,
  clientIp,
  enforceRateLimit,
  getRateLimiterAdapter,
  json,
  rateLimit,
  readJson,
  resetRateLimits,
  setRateLimiterAdapter,
  withApi,
} from './http';

test('assertSameOrigin allows valid same-origin and trusted proxy hosts', () => {
  // Matching request host
  const req1 = new NextRequest('http://localhost:3000/api/tasks', {
    headers: { origin: 'http://localhost:3000' },
  });
  assert.doesNotThrow(() => assertSameOrigin(req1));

  // Matching Host header
  const req2 = new NextRequest('http://127.0.0.1:3000/api/tasks', {
    headers: { host: 'winit.app', origin: 'https://winit.app' },
  });
  assert.doesNotThrow(() => assertSameOrigin(req2));

  // Matching X-Forwarded-Host
  const req3 = new NextRequest('http://internal-service/api/tasks', {
    headers: { 'x-forwarded-host': 'winit.local:8080', origin: 'http://winit.local:8080' },
  });
  assert.doesNotThrow(() => assertSameOrigin(req3));

  // Request without origin header (e.g., cURL, native clients)
  const req4 = new NextRequest('http://localhost:3000/api/tasks');
  assert.doesNotThrow(() => assertSameOrigin(req4));
});

test('assertSameOrigin rejects untrusted, null or malformed origins', () => {
  // Null origin
  const req1 = new NextRequest('http://localhost:3000/api/tasks', {
    headers: { origin: 'null' },
  });
  assert.throws(() => assertSameOrigin(req1), (err: unknown) => {
    return err instanceof ApiError && err.status === 403 && err.code === 'bad_origin';
  });

  // Untrusted attacker origin
  const req2 = new NextRequest('http://localhost:3000/api/tasks', {
    headers: { origin: 'https://attacker.example.com' },
  });
  assert.throws(() => assertSameOrigin(req2), (err: unknown) => {
    return err instanceof ApiError && err.status === 403 && err.code === 'bad_origin';
  });

  // Malformed origin
  const req3 = new NextRequest('http://localhost:3000/api/tasks', {
    headers: { origin: 'not-a-valid-url' },
  });
  assert.throws(() => assertSameOrigin(req3), (err: unknown) => {
    return err instanceof ApiError && err.status === 403 && err.code === 'bad_origin';
  });
});

test('assertCsrf enforces matching cookie and header', () => {
  const token = 'a-secure-csrf-token-1234567890';

  // Matching cookie and header
  const req1 = new NextRequest('http://localhost:3000/api/tasks', {
    headers: {
      cookie: `${CSRF_COOKIE}=${token}`,
      [CSRF_HEADER]: token,
    },
  });
  assert.doesNotThrow(() => assertCsrf(req1));

  // Missing header
  const req2 = new NextRequest('http://localhost:3000/api/tasks', {
    headers: { cookie: `${CSRF_COOKIE}=${token}` },
  });
  assert.throws(() => assertCsrf(req2), (err: unknown) => {
    return err instanceof ApiError && err.status === 403 && err.code === 'csrf_failed';
  });

  // Missing cookie
  const req3 = new NextRequest('http://localhost:3000/api/tasks', {
    headers: { [CSRF_HEADER]: token },
  });
  assert.throws(() => assertCsrf(req3), (err: unknown) => {
    return err instanceof ApiError && err.status === 403 && err.code === 'csrf_failed';
  });

  // Mismatched token
  const req4 = new NextRequest('http://localhost:3000/api/tasks', {
    headers: {
      cookie: `${CSRF_COOKIE}=${token}`,
      [CSRF_HEADER]: 'tampered-token-value',
    },
  });
  assert.throws(() => assertCsrf(req4), (err: unknown) => {
    return err instanceof ApiError && err.status === 403 && err.code === 'csrf_failed';
  });
});

test('readJson validates content type, payload size and strict schema', async () => {
  const schema = z.object({ title: z.string().min(1) }).strict();

  // Valid JSON body
  const req1 = new NextRequest('http://localhost:3000/api/tasks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'مهمة جديدة' }),
  });
  const data = await readJson(req1, schema);
  assert.equal(data.title, 'مهمة جديدة');

  // Unsupported content-type
  const req2 = new NextRequest('http://localhost:3000/api/tasks', {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: JSON.stringify({ title: 'مهمة جديدة' }),
  });
  await assert.rejects(async () => readJson(req2, schema), (err: unknown) => {
    return err instanceof ApiError && err.status === 415 && err.code === 'unsupported_media_type';
  });

  // Malformed JSON syntax
  const req3 = new NextRequest('http://localhost:3000/api/tasks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{ bad json',
  });
  await assert.rejects(async () => readJson(req3, schema), (err: unknown) => {
    return err instanceof ApiError && err.status === 400 && err.code === 'invalid_json';
  });

  // Payload too large via header
  const req4 = new NextRequest('http://localhost:3000/api/tasks', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': String(MAX_BODY_BYTES + 10),
    },
    body: JSON.stringify({ title: 'big' }),
  });
  await assert.rejects(async () => readJson(req4, schema), (err: unknown) => {
    return err instanceof ApiError && err.status === 413 && err.code === 'payload_too_large';
  });

  // Strict validation error with field header
  const req5 = new NextRequest('http://localhost:3000/api/tasks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'مهمة', unexpectedField: true }),
  });
  await assert.rejects(async () => readJson(req5, schema), (err: unknown) => {
    return err instanceof ApiError && err.status === 400 && err.code === 'validation_failed';
  });
});

test('clientIp handles proxy trust settings correctly', () => {
  const origProxy = process.env.WINIT_TRUST_PROXY;

  // Untrusted proxy
  delete process.env.WINIT_TRUST_PROXY;
  const reqUntrusted = new NextRequest('http://localhost:3000/api/tasks', {
    headers: { 'x-forwarded-for': '1.2.3.4' },
  });
  assert.equal(clientIp(reqUntrusted), 'untrusted');

  // Trusted proxy
  process.env.WINIT_TRUST_PROXY = '1';
  const reqTrusted = new NextRequest('http://localhost:3000/api/tasks', {
    headers: { 'x-forwarded-for': '10.0.0.1, 1.2.3.4' },
  });
  assert.equal(clientIp(reqTrusted), '1.2.3.4');

  // CF Connecting IP precedence
  const reqCf = new NextRequest('http://localhost:3000/api/tasks', {
    headers: {
      'cf-connecting-ip': '5.6.7.8',
      'x-forwarded-for': '1.2.3.4',
    },
  });
  assert.equal(clientIp(reqCf), '5.6.7.8');

  // Restore env
  if (origProxy !== undefined) process.env.WINIT_TRUST_PROXY = origProxy;
  else delete process.env.WINIT_TRUST_PROXY;
});

test('rateLimit and MemoryRateLimiter manage quotas, windows and LRU eviction', async () => {
  const originalAdapter = getRateLimiterAdapter();
  const limiter = new MemoryRateLimiter(2); // small max for testing eviction
  setRateLimiterAdapter(limiter);

  resetRateLimits();

  const r1 = await rateLimit('test:user1', 2, 60000);
  assert.equal(r1.ok, true);
  assert.equal(r1.remaining, 1);

  const r2 = await rateLimit('test:user1', 2, 60000);
  assert.equal(r2.ok, true);
  assert.equal(r2.remaining, 0);

  // Exceeded
  const r3 = await rateLimit('test:user1', 2, 60000);
  assert.equal(r3.ok, false);
  assert.equal(r3.remaining, 0);
  assert.ok(r3.retryAfter > 0);

  // Test enforceRateLimit throws
  const req = new NextRequest('http://localhost:3000/api/tasks');
  assert.throws(() => enforceRateLimit(req, 'test', 0, 60000), (err: unknown) => {
    return err instanceof ApiError && err.status === 429 && err.code === 'rate_limited';
  });

  // Test LRU eviction when maxBuckets exceeded
  await rateLimit('test:k1', 5, 60000);
  await rateLimit('test:k2', 5, 60000);
  await rateLimit('test:k3', 5, 60000);
  assert.ok(limiter.size <= 2);

  // Restore adapter
  setRateLimiterAdapter(originalAdapter);
});

test('UpstashRedisRateLimiter adapts distributed rate limits', async () => {
  // Test mock Upstash adapter
  let pipelineCalled = false;
  const mockFetch = async () => {
    pipelineCalled = true;
    return new Response(JSON.stringify([{ result: 1 }, { result: 60 }]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const origFetch = globalThis.fetch;
  globalThis.fetch = mockFetch as unknown as typeof fetch;

  try {
    const upstash = new UpstashRedisRateLimiter('https://mock-upstash.com', 'test-token');
    const result = await upstash.limit('user-42', 10, 60000);
    assert.equal(pipelineCalled, true);
    assert.equal(result.ok, true);
    assert.equal(result.remaining, 9);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('withApi wraps handlers with logging, requestId, and handles errors safely', async () => {
  // Success case
  const okHandler = withApi('test.ok', async () => {
    return json({ hello: 'world' });
  });

  const req1 = new NextRequest('http://localhost:3000/api/test');
  const res1 = await okHandler(req1, { params: Promise.resolve({}) });
  assert.equal(res1.status, 200);
  assert.ok(res1.headers.get('x-request-id'));
  assert.equal(res1.headers.get('cache-control'), 'no-store');

  // ApiError case
  const apiErrorHandler = withApi('test.error', async () => {
    throw new ApiError(404, 'العنصر غير موجود', 'not_found');
  });
  const res2 = await apiErrorHandler(req1, { params: Promise.resolve({}) });
  assert.equal(res2.status, 404);
  const data2 = await res2.json();
  assert.equal(data2.code, 'not_found');
  assert.equal(data2.error, 'العنصر غير موجود');

  // ZodError case
  const zodErrorHandler = withApi('test.zod', async () => {
    z.string().parse(12345);
    return json({});
  });
  const res3 = await zodErrorHandler(req1, { params: Promise.resolve({}) });
  assert.equal(res3.status, 400);
  const data3 = await res3.json();
  assert.equal(data3.code, 'validation_failed');

  // Unhandled internal error case (no stack trace leaked)
  const unhandledHandler = withApi('test.internal', async () => {
    throw new Error('Database password leak: secret123');
  });
  const res4 = await unhandledHandler(req1, { params: Promise.resolve({}) });
  assert.equal(res4.status, 500);
  const data4 = await res4.json();
  assert.equal(data4.code, 'internal_error');
  assert.equal(data4.error, 'حدث خطأ غير متوقع في الخادم');
  assert.equal(data4.stack, undefined);
  assert.ok(!JSON.stringify(data4).includes('secret123'));
});
