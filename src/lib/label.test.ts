import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isTruncated, truncateWords } from './label';

test('one and two word names are kept intact', () => {
  assert.equal(truncateWords('البرمجة'), 'البرمجة');
  assert.equal(truncateWords('اللغة الإنجليزية'), 'اللغة الإنجليزية');
  assert.equal(truncateWords('العلوم الشرعية'), 'العلوم الشرعية');
});

test('three or more words are cut to two plus an ellipsis', () => {
  assert.equal(truncateWords('مشروع تعلم اللغة الإنجليزية'), 'مشروع تعلم…');
  assert.equal(truncateWords('one two three four five'), 'one two…');
});

test('the ellipsis is U+2026, not three dots or a pictograph', () => {
  const out = truncateWords('a b c');
  assert.ok(out.endsWith('\u2026'), out);
  assert.ok(!out.includes('...'), out);
});

test('whitespace runs collapse and edges are trimmed', () => {
  assert.equal(truncateWords('  اللغة   الإنجليزية  '), 'اللغة الإنجليزية');
  assert.equal(truncateWords(' مشروع  تعلم  اللغة '), 'مشروع تعلم…');
  assert.equal(truncateWords('سطر\nجديد\tثالث'), 'سطر جديد…');
});

test('empty, whitespace-only, null and undefined produce an empty string', () => {
  for (const value of ['', '   ', '\n\t', null, undefined]) {
    assert.equal(truncateWords(value), '');
    assert.equal(isTruncated(value), false);
  }
});

test('a single very long word is left to CSS ellipsis, not cut mid-word', () => {
  const long = 'كلمةطويلةجداًبلا مسافات';
  assert.equal(truncateWords(long), long);
  assert.equal(isTruncated(long), false);
});

test('the word limit is configurable and degenerate limits are safe', () => {
  assert.equal(truncateWords('a b c d', 1), 'a…');
  assert.equal(truncateWords('a b c d', 3), 'a b c…');
  assert.equal(truncateWords('a b c d', 0), 'a b c d');
  assert.equal(truncateWords('a b c d', -1), 'a b c d');
});

test('isTruncated agrees with truncateWords exactly', () => {
  for (const value of ['a', 'a b', 'a b c', '  a  b  c  ', '', 'البرمجة', 'مشروع تعلم اللغة']) {
    assert.equal(isTruncated(value), truncateWords(value) !== value.replace(/\s+/g, ' ').trim(), value);
  }
});

test('truncation is idempotent — shortening an already short label does nothing', () => {
  const once = truncateWords('مشروع تعلم اللغة الإنجليزية');
  assert.equal(truncateWords(once), once);
});

test('Arabic text is never reversed or stripped of diacritics', () => {
  assert.equal(truncateWords('قِراءة القُرآن الكريم'), 'قِراءة القُرآن…');
});
