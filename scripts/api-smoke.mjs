#!/usr/bin/env node
/**
 * API smoke + security regression suite, run against a real production server.
 *
 * Requires demo mode to be OFF so the authentication boundary is exercised.
 *
 * Each run presents a unique X-Forwarded-For so the in-process rate limiter
 * starts from a clean bucket; the server must therefore run with
 * WINIT_TRUST_PROXY=1. Without it every run shares one bucket and a second run
 * within 15 minutes is (correctly) throttled.
 *
 * Usage: node scripts/api-smoke.mjs [base-url]
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3000';
// Derive the origin from the server under test. Hardcoding a port made the
// TLS-proxy checks pass only when the probe happened to run on that port and
// fail in CI, which serves on 3000.
const HOST = new URL(BASE).host;
// Private range, randomised per run so rate-limit buckets do not carry over.
const octet = () => Math.floor(Math.random() * 254) + 1;
const RUN_IP = `10.${octet()}.${octet()}.${octet()}`;

let passed = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) { passed += 1; console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`); }
  else { failures.push(name); console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

/** Minimal cookie jar so a scripted client behaves like a browser. */
class Client {
  constructor() { this.cookies = new Map(); }
  cookieHeader() { return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '); }
  absorb(response) {
    for (const raw of response.headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(';');
      const idx = pair.indexOf('=');
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (value === '') this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }
  async call(path, { method = 'GET', body, headers = {}, csrf = true, raw } = {}) {
    const h = { 'x-forwarded-for': RUN_IP, ...headers };
    if (this.cookies.size) h.cookie = this.cookieHeader();
    if (csrf && method !== 'GET' && !h['x-csrf-token'] && this.cookies.has('winit_csrf')) h['x-csrf-token'] = this.cookies.get('winit_csrf');
    let payload;
    if (raw !== undefined) { payload = raw; }
    else if (body !== undefined) { h['content-type'] ??= 'application/json'; payload = JSON.stringify(body); }
    const response = await fetch(`${BASE}${path}`, { method, headers: h, body: payload, redirect: 'manual' });
    this.absorb(response);
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* non-JSON body */ }
    return { status: response.status, json, text, headers: response.headers };
  }
}

const anon = new Client();
const alice = new Client();
const bob = new Client();
const stamp = Date.now();
const aliceEmail = `alice-${stamp}@example.com`;
const bobEmail = `bob-${stamp}@example.com`;
const PASSWORD = 'correct-horse-battery';

/* ---- health & headers -------------------------------------------------- */
const health = await anon.call('/api/health');
check('health endpoint responds 200', health.status === 200, `status ${health.status}`);
check('health reports database up', health.json?.database === 'up');
check('health reports demo mode off', health.json?.demoMode === false, `demoMode=${health.json?.demoMode}`);
check('health leaks no stack or path', !/\/home\/|node_modules|at \w+ \(/.test(health.text));

const page = await fetch(BASE, { redirect: 'manual' });
const csp = page.headers.get('content-security-policy') ?? '';
check('CSP header present', csp.includes("default-src 'self'"), csp.slice(0, 60));
check('CSP blocks framing', csp.includes("frame-ancestors 'none'"));
check('CSP blocks plugins', csp.includes("object-src 'none'"));
check('nosniff header present', page.headers.get('x-content-type-options') === 'nosniff');
check('frame denial header present', page.headers.get('x-frame-options') === 'DENY');
check('referrer policy present', page.headers.get('referrer-policy') === 'strict-origin-when-cross-origin');
check('HSTS present', (page.headers.get('strict-transport-security') ?? '').includes('max-age='));
check('permissions policy present', (page.headers.get('permissions-policy') ?? '').includes('camera=()'));
check('x-powered-by removed', page.headers.get('x-powered-by') === null);

/* ---- authentication boundary ------------------------------------------- */
const guarded = await anon.call('/api/overview');
check('anonymous overview is 401', guarded.status === 401, `status ${guarded.status}`);
check('anonymous write is 401', (await anon.call('/api/tasks', { method: 'POST', body: { title: 'x' } })).status === 401);
check('anonymous journal is 401', (await anon.call('/api/journal')).status === 401);
check('anonymous habit history is 401', (await anon.call('/api/habits/whatever/history')).status === 401);
check('401 carries a request id', Boolean(guarded.headers.get('x-request-id')));
check('401 body has a machine-readable code', guarded.json?.code === 'unauthenticated');
check('API responses are no-store', (guarded.headers.get('cache-control') ?? '').includes('no-store'));

const session0 = await anon.call('/api/auth/session');
check('session endpoint reports anonymous', session0.status === 200 && session0.json?.user === null);

/* ---- registration ------------------------------------------------------ */
const weak = await alice.call('/api/auth/register', { method: 'POST', body: { email: `weak-${stamp}@example.com`, name: 'Weak', password: 'short' } });
check('short password rejected', weak.status === 400, `status ${weak.status}`);
const badEmail = await alice.call('/api/auth/register', { method: 'POST', body: { email: 'not-an-email', name: 'X', password: PASSWORD } });
check('invalid email rejected', badEmail.status === 400);

const reg = await alice.call('/api/auth/register', { method: 'POST', body: { email: aliceEmail, name: 'Alice', password: PASSWORD } });
check('registration returns 201', reg.status === 201, `status ${reg.status} ${reg.text.slice(0, 120)}`);
check('session cookie is HttpOnly', (reg.headers.getSetCookie?.() ?? []).some((c) => c.startsWith('winit_session=') && /httponly/i.test(c)));
check('session cookie is SameSite=Lax', (reg.headers.getSetCookie?.() ?? []).some((c) => c.startsWith('winit_session=') && /samesite=lax/i.test(c)));
check('CSRF cookie is readable by script', (reg.headers.getSetCookie?.() ?? []).some((c) => c.startsWith('winit_csrf=') && !/httponly/i.test(c)));
check('registration response omits the password hash', !/passwordHash|scrypt\$/.test(reg.text));

const dupe = await alice.call('/api/auth/register', { method: 'POST', body: { email: aliceEmail, name: 'Alice', password: PASSWORD } });
check('duplicate email is 409', dupe.status === 409, `status ${dupe.status}`);

const me = await alice.call('/api/auth/session');
check('session resolves the new user', me.json?.user?.email === aliceEmail);
check('session is not demo', me.json?.user?.demo === false);
const workspaceA = me.json?.user?.workspaceId;
check('a personal workspace was created', Boolean(workspaceA));

const overviewA = await alice.call('/api/overview');
check('authenticated overview is 200', overviewA.status === 200);
check('a new workspace starts empty', overviewA.json?.tasks?.length === 0 && overviewA.json?.projects?.length === 0);

/* ---- CSRF & content type ---------------------------------------------- */
const noCsrf = await alice.call('/api/tasks', { method: 'POST', body: { title: 'no csrf' }, csrf: false });
check('mutation without CSRF header is 403', noCsrf.status === 403, `status ${noCsrf.status}`);
const wrongCsrf = await alice.call('/api/tasks', { method: 'POST', body: { title: 'bad csrf' }, headers: { 'x-csrf-token': 'forged' } });
check('mutation with a forged CSRF token is 403', wrongCsrf.status === 403);
const crossOrigin = await alice.call('/api/tasks', { method: 'POST', body: { title: 'cross site' }, headers: { origin: 'https://evil.example' } });
check('cross-origin mutation is 403', crossOrigin.status === 403, `status ${crossOrigin.status}`);
const nullOrigin = await alice.call('/api/tasks', { method: 'POST', body: { title: 'null origin' }, headers: { origin: 'null' } });
check('null Origin is rejected', nullOrigin.status === 403);
// TLS-terminating proxy: browser Origin is https, Next may see http internally.
const tlsOrigin = await alice.call('/api/tasks', { method: 'POST', body: { title: 'proxied' }, headers: { origin: `https://${HOST}` } });
check('same host over https is accepted behind a TLS proxy', tlsOrigin.status === 201, `status ${tlsOrigin.status}`);
if (tlsOrigin.json?.id) await alice.call(`/api/tasks/${tlsOrigin.json.id}`, { method: 'DELETE' });
const evilSubdomain = await alice.call('/api/tasks', { method: 'POST', body: { title: 'x' }, headers: { origin: `https://${HOST}.evil.example` } });
check('a look-alike host is still rejected', evilSubdomain.status === 403, `status ${evilSubdomain.status}`);
const textPlain = await alice.call('/api/tasks', { method: 'POST', raw: JSON.stringify({ title: 'text plain' }), headers: { 'content-type': 'text/plain' } });
check('text/plain body is 415 (blocks simple form posts)', textPlain.status === 415, `status ${textPlain.status}`);
const brokenJson = await alice.call('/api/tasks', { method: 'POST', raw: '{not json', headers: { 'content-type': 'application/json' } });
check('malformed JSON is 400', brokenJson.status === 400);

/* ---- strict DTOs ------------------------------------------------------ */
const unknownKey = await alice.call('/api/tasks', { method: 'POST', body: { title: 'x', workspaceId: 'someone-else' } });
check('unknown body key is rejected (no mass assignment)', unknownKey.status === 400, `status ${unknownKey.status}`);
const badDate = await alice.call('/api/tasks', { method: 'POST', body: { title: 'x', dueDate: '2026-02-31' } });
check('impossible calendar date rejected', badDate.status === 400, `status ${badDate.status}`);
const badShape = await alice.call('/api/tasks', { method: 'POST', body: { title: 'x', dueDate: 'tomorrow' } });
check('non-ISO date rejected', badShape.status === 400);
const oversized = await alice.call('/api/tasks', { method: 'POST', body: { title: 'x', notes: 'a'.repeat(70000) } });
check('oversized body rejected', oversized.status === 413 || oversized.status === 400, `status ${oversized.status}`);
const badColor = await alice.call('/api/projects', { method: 'POST', body: { name: 'x', color: 'red; DROP TABLE' } });
check('invalid colour rejected', badColor.status === 400);

/* ---- exact route matching --------------------------------------------- */
check('over-long task path is 404', (await alice.call('/api/tasks/a/b/c')).status === 404);
check('unknown collection is 404', (await alice.call('/api/secrets')).status === 404);
check('POST to a read-only collection is 404', (await alice.call('/api/overview', { method: 'POST', body: {} })).status === 404);
check('trailing extra segment on log is 404', (await alice.call('/api/habits/x/log/extra', { method: 'POST', body: { date: '2026-01-01', value: 1 } })).status === 404);

/* ---- CRUD + idempotency ---------------------------------------------- */
const created = await alice.call('/api/tasks', { method: 'POST', body: { title: 'مهمة اختبار' } });
check('task creation returns 201', created.status === 201, `status ${created.status}`);
const taskId = created.json?.id;

const first = await alice.call(`/api/tasks/${taskId}/complete`, { method: 'POST' });
check('complete returns 200', first.status === 200);
const completedAt = first.json?.completedAt;
await new Promise((r) => setTimeout(r, 25));
const second = await alice.call(`/api/tasks/${taskId}/complete`, { method: 'POST' });
check('repeated complete is idempotent', second.json?.completedAt === completedAt, `${completedAt} → ${second.json?.completedAt}`);
const patched = await alice.call(`/api/tasks/${taskId}`, { method: 'PATCH', body: { status: 'completed' } });
check('PATCH to completed also preserves the timestamp', patched.json?.completedAt === completedAt);
const restored = await alice.call(`/api/tasks/${taskId}/restore`, { method: 'POST' });
check('restore clears completedAt', restored.json?.completedAt === null && restored.json?.status === 'todo');

/* ---- tenant isolation ------------------------------------------------- */
const regB = await bob.call('/api/auth/register', { method: 'POST', body: { email: bobEmail, name: 'Bob', password: PASSWORD } });
check('second account registers', regB.status === 201);
const workspaceB = (await bob.call('/api/auth/session')).json?.user?.workspaceId;
check('workspaces are distinct', workspaceA !== workspaceB);
check("Bob cannot list Alice's tasks", (await bob.call('/api/overview')).json?.tasks?.length === 0);
check("Bob cannot patch Alice's task", (await bob.call(`/api/tasks/${taskId}`, { method: 'PATCH', body: { title: 'stolen' } })).status === 404);
check("Bob cannot complete Alice's task", (await bob.call(`/api/tasks/${taskId}/complete`, { method: 'POST' })).status === 404);
check("Bob cannot delete Alice's task", (await bob.call(`/api/tasks/${taskId}`, { method: 'DELETE' })).status === 404);
const stillAlice = await alice.call('/api/overview');
check("Alice's task is untouched", stillAlice.json?.tasks?.find((t) => t.id === taskId)?.title === 'مهمة اختبار');

const aliceProject = await alice.call('/api/projects', { method: 'POST', body: { name: 'مشروع أليس' } });
const crossTenantRef = await bob.call('/api/tasks', { method: 'POST', body: { title: 'x', projectId: aliceProject.json?.id } });
check("Bob cannot attach a task to Alice's project", crossTenantRef.status === 404, `status ${crossTenantRef.status}`);

// The project icon catalogue grew; the API enum must accept every new id.
const newIcon = await alice.call('/api/projects', { method: 'POST', body: { name: 'أيقونة جديدة', icon: 'rocket', color: '#A32E93' } });
check('API accepts a new picker icon', newIcon.status === 201, `status ${newIcon.status}`);
check('API stores the new palette colour', newIcon.json?.color === '#A32E93', `color ${newIcon.json?.color}`);
if (newIcon.json?.id) await alice.call(`/api/projects/${newIcon.json.id}`, { method: 'DELETE' });
const badIcon = await alice.call('/api/projects', { method: 'POST', body: { name: 'x', icon: 'unicorn' } });
check('API rejects an icon outside the catalogue', badIcon.status === 400, `status ${badIcon.status}`);

// The habit icon catalogue grew from 4 to 34; the DTO enum must track it.
const newHabitIcon = await alice.call('/api/habits', { method: 'POST', body: { name: 'عادة جديدة', recordType: 'check', targetValue: 1, icon: 'moon-star', color: '#6A4CA3' } });
check('API accepts a new habit icon', newHabitIcon.status === 201, `status ${newHabitIcon.status}`);
check('API stores the new habit icon', newHabitIcon.json?.icon === 'moon-star', `icon ${newHabitIcon.json?.icon}`);
if (newHabitIcon.json?.id) await alice.call(`/api/habits/${newHabitIcon.json.id}`, { method: 'DELETE' });
const badHabitIcon = await alice.call('/api/habits', { method: 'POST', body: { name: 'x', recordType: 'check', targetValue: 1, icon: 'unicorn' } });
check('API rejects a habit icon outside the catalogue', badHabitIcon.status === 400, `status ${badHabitIcon.status}`);
const legacyHabitIcon = await alice.call('/api/habits', { method: 'POST', body: { name: 'قديمة', recordType: 'check', targetValue: 1, icon: 'book-open' } });
check('the original habit icons still work', legacyHabitIcon.status === 201, `status ${legacyHabitIcon.status}`);
if (legacyHabitIcon.json?.id) await alice.call(`/api/habits/${legacyHabitIcon.json.id}`, { method: 'DELETE' });

const aliceHabit = await alice.call('/api/habits', { method: 'POST', body: { name: 'عادة', recordType: 'check', targetValue: 1 } });
const habitId = aliceHabit.json?.id;
check("Bob cannot read Alice's habit history", (await bob.call(`/api/habits/${habitId}/history`)).status === 404);
check("Bob cannot log against Alice's habit", (await bob.call(`/api/habits/${habitId}/log`, { method: 'POST', body: { date: '2026-01-01', value: 1 } })).status === 404);

/* ---- habit history ---------------------------------------------------- */
const today = new Date().toISOString().slice(0, 10);
await alice.call(`/api/habits/${habitId}/log`, { method: 'POST', body: { date: today, value: 1 } });
const history = await alice.call(`/api/habits/${habitId}/history?days=182`);
check('history returns the requested window', history.status === 200 && history.json?.days === 182);
check('history contains the logged day', history.json?.logs?.some((l) => l.date === today && l.value === 1));
check('history clamps an absurd range', (await alice.call(`/api/habits/${habitId}/history?days=99999`)).json?.days === 730);
check('history rejects nothing silently — non-numeric falls back', (await alice.call(`/api/habits/${habitId}/history?days=abc`)).json?.days === 182);
check('history rejects an impossible date param', (await alice.call(`/api/habits/${habitId}/history?date=2026-02-31`)).status === 400);
await alice.call(`/api/habits/${habitId}/log`, { method: 'POST', body: { date: today, value: 0 } });
check('logging zero removes the day', !(await alice.call(`/api/habits/${habitId}/history`)).json?.logs?.some((l) => l.date === today));

/* ---- journal privacy & search ---------------------------------------- */
const entry = await alice.call('/api/journal', { method: 'POST', body: { entryDate: today, title: 'يوم خاص', content: 'محتوى خاص جداً%', mood: 'calm' } });
check('journal entry created', entry.status === 201);
const entryId = entry.json?.id;
check("Bob cannot read Alice's journal", (await bob.call('/api/journal')).json?.entries?.length === 0);
check("Bob cannot patch Alice's entry", (await bob.call(`/api/journal/${entryId}`, { method: 'PATCH', body: { content: 'stolen' } })).status === 404);
check("Bob cannot delete Alice's entry", (await bob.call(`/api/journal/${entryId}`, { method: 'DELETE' })).status === 404);
const wildcard = await alice.call('/api/journal?q=%25');
check('q=% is a literal search, not match-all', wildcard.json?.total === 1, `total ${wildcard.json?.total}`);
const noMatch = await alice.call('/api/journal?q=%25%25%25nomatch');
check('a wildcard-only query does not match everything', noMatch.json?.total === 0, `total ${noMatch.json?.total}`);
const real = await alice.call(`/api/journal?q=${encodeURIComponent('خاص')}`);
check('a genuine substring search still works', real.json?.total === 1);

/* ---- focus duration cannot be inflated ------------------------------- */
const focus = await alice.call('/api/focus/start', { method: 'POST', body: { mode: 'pomodoro', plannedSeconds: 1500 } });
check('focus session starts', focus.status === 201);
const finished = await alice.call(`/api/focus/${focus.json?.id}/finish`, { method: 'POST', body: { actualSeconds: 14400, completed: true } });
check('claimed duration is clamped to wall-clock time', (finished.json?.actualSeconds ?? 999) <= 10, `actualSeconds ${finished.json?.actualSeconds}`);
check('finishing twice is 404', (await alice.call(`/api/focus/${focus.json?.id}/finish`, { method: 'POST', body: { actualSeconds: 1, completed: true } })).status === 404);

/* ---- login, enumeration and logout ----------------------------------- */
const wrongPassword = await anon.call('/api/auth/login', { method: 'POST', body: { email: aliceEmail, password: 'wrong-password-here' } });
const unknownUser = await anon.call('/api/auth/login', { method: 'POST', body: { email: `nobody-${stamp}@example.com`, password: 'wrong-password-here' } });
check('wrong password is 401', wrongPassword.status === 401);
check('unknown account is 401', unknownUser.status === 401);
check('login errors are indistinguishable', wrongPassword.json?.error === unknownUser.json?.error);

const carol = new Client();
const goodLogin = await carol.call('/api/auth/login', { method: 'POST', body: { email: aliceEmail, password: PASSWORD } });
check('correct credentials sign in', goodLogin.status === 200, `status ${goodLogin.status}`);
check('login issues a fresh CSRF token', Boolean(carol.cookies.get('winit_csrf')));
const logout = await carol.call('/api/auth/logout', { method: 'POST' });
check('logout succeeds', logout.status === 200);
check('session cookie cleared', !carol.cookies.has('winit_session'));
carol.cookies.set('winit_session', goodLogin.headers.getSetCookie().find((c) => c.startsWith('winit_session=')).split(';')[0].split('=')[1]);
check('a destroyed session token no longer works', (await carol.call('/api/overview')).status === 401);

/* ---- rate limiting ---------------------------------------------------- */
const hammer = new Client();
let limited = null;
for (let i = 0; i < 14; i += 1) {
  const r = await hammer.call('/api/auth/login', { method: 'POST', body: { email: `flood-${stamp}@example.com`, password: 'wrong-password-here' } });
  if (r.status === 429) { limited = r; break; }
}
check('repeated failed logins are rate limited', limited !== null, limited ? `429 after burst` : 'no 429 in 14 attempts');
check('429 advertises Retry-After', Boolean(limited?.headers.get('retry-after')));

/* ---- summary ---------------------------------------------------------- */
console.log(`\n${passed}/${passed + failures.length} checks passed`);
if (failures.length) {
  console.error('FAILURES:\n  - ' + failures.join('\n  - '));
  process.exit(1);
}
