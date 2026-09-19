import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultReading, normalizeReading, recordReading, HISTORY_AGE, HISTORY_LIMIT } from '../src/services/reading.js';

test('history is opt-in and disabling drops all records', () => {
  assert.deepEqual(recordReading(defaultReading(), 'indicator', 'glucose'), defaultReading());
  assert.deepEqual(normalizeReading({ enabled: false, large: true, entries: [{ kind: 'indicator', id: 'glucose', at: Date.now() }] }), { large: true, enabled: false, entries: [] });
});
test('history expires, validates, deduplicates, limits and strips content', () => {
  const now = Date.now();
  const value = { enabled: true, entries: [
    { kind: 'indicator', id: 'glucose', at: now, title: 'never store medical text' },
    { kind: 'indicator', id: 'glucose', at: now - 1 },
    { kind: 'organ', id: 'liver', at: now - HISTORY_AGE },
    { kind: 'organ', id: 'heart', at: now + 1 },
    { kind: 'organ', id: '<script>', at: now }, null,
  ] };
  assert.deepEqual(normalizeReading(value, now).entries, [{ kind: 'indicator', id: 'glucose', at: now }]);
  assert.equal(normalizeReading({ enabled: true, entries: Array.from({ length: 40 }, (_, i) => ({ kind: 'indicator', id: `topic-${i}`, at: now - i })) }, now).entries.length, HISTORY_LIMIT);
  assert.deepEqual(normalizeReading(null), defaultReading());
  assert.deepEqual(normalizeReading({ enabled: 'true', large: 'false', entries: {} }), defaultReading());
});
test('revisits move a topic first without confusing kinds', () => {
  const now = Date.now();
  let value = { ...defaultReading(), enabled: true };
  value = recordReading(value, 'indicator', 'glucose', now - 2);
  value = recordReading(value, 'organ', 'liver', now - 1);
  value = recordReading(value, 'indicator', 'glucose', now);
  assert.deepEqual(value.entries.map(x => x.id), ['glucose', 'liver']);
});
