import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultReading, normalizeReading, recordReading, recordPosition, readingRevision, HISTORY_AGE, HISTORY_LIMIT } from '../src/services/reading.js';

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

test('positions are allowlisted per kind and persist only section/revision, not text or coordinates', () => {
  const now = Date.now();
  const entry = { kind: 'indicator', id: 'glucose', at: now, visit: 'visit-a', position: { section: 'article-metrics', revision: 'release:4', offset: 987, text: 'private' } };
  const result = normalizeReading({ enabled: true, entries: [entry] }, now);
  assert.deepEqual(result.entries[0].position, { section: 'article-metrics', revision: 'release:4' });
  assert.equal(normalizeReading({ enabled: true, entries: [{ ...entry, kind: 'organ' }] }, now).entries[0].position, undefined);
  assert.equal(normalizeReading({ enabled: true, entries: [{ ...entry, position: { section: '__proto__', revision: 'x' } }] }, now).entries[0].position, undefined);
  assert.equal(readingRevision({ releaseID: 4 }), 'release:4');
  assert.notEqual(readingRevision({ version: 1, updatedAt: '2026-09-19' }), readingRevision({ version: 2, updatedAt: '2026-09-19' }));
});
test('revisit preserves same-version position; publication changes invalidate it', () => {
  const now = Date.now();
  let value = recordReading({ ...defaultReading(), enabled: true }, 'indicator', 'glucose', now - 2, { revision: 'release:4', visit: 'visit-a' });
  value = recordPosition(value, 'indicator', 'glucose', 'visit-a', { section: 'article-metrics', revision: 'release:4' }, now - 1);
  const same = recordReading(value, 'indicator', 'glucose', now, { revision: 'release:4', visit: 'visit-b' });
  assert.equal(same.entries[0].position.section, 'article-metrics');
  const changed = recordReading(value, 'indicator', 'glucose', now, { revision: 'release:5', visit: 'visit-c' });
  assert.equal(changed.entries[0].position, undefined);
});
test('delayed scroll cannot recreate cleared/disabled history or overwrite a newer tab visit', () => {
  const now = Date.now();
  const point = { section: 'article-source-panel', revision: 'release:4' };
  const empty = { ...defaultReading(), enabled: true };
  assert.equal(recordPosition(empty, 'indicator', 'glucose', 'old-visit', point, now), empty);
  const disabled = defaultReading();
  assert.equal(recordPosition(disabled, 'indicator', 'glucose', 'old-visit', point, now), disabled);
  const newer = recordReading(empty, 'indicator', 'glucose', now, { revision: 'release:4', visit: 'new-visit' });
  assert.equal(recordPosition(newer, 'indicator', 'glucose', 'old-visit', point, now), newer);
  const saved = recordPosition(newer, 'indicator', 'glucose', 'new-visit', point, now);
  assert.equal(saved.entries[0].position.section, 'article-source-panel');
  assert.equal(recordPosition(saved, 'indicator', 'glucose', 'new-visit', point, now), saved);
});
