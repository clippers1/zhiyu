import test from 'node:test';
import assert from 'node:assert/strict';
import { createBookmarkStore, normalizeBookmarks, savedContent } from '../src/services/bookmarks.js';
import { createContentRepository, selectPage } from '../src/services/content.js';

function memory(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}
test('legacy IDs stay compatible without rewriting on read; types remain independent', () => {
  const storage = memory({ 'zhiyu-saved': '["glucose","glucose","../bad",2,"liver"]' });
  const store = createBookmarkStore(storage);
  assert.deepEqual(store.sync(null).saved, ['glucose', 'liver']);
  assert.equal(storage.getItem('zhiyu-saved'), '["glucose","glucose","../bad",2,"liver"]');
  assert.equal(storage.getItem('zhiyu-saved-organs'), null);
  store.change('organ', 'add', ['liver']);
  assert.deepEqual(store.change('indicator', 'remove', ['liver']).savedOrgans, ['liver']);
  assert.deepEqual(normalizeBookmarks(null), []);
});
test('edits read latest tab state and removal targets a snapshot; clear events do not resurrect IDs', () => {
  const storage = memory();
  const first = createBookmarkStore(storage), second = createBookmarkStore(storage);
  first.sync(null); second.sync(null);
  first.change('indicator', 'add', ['glucose']);
  assert.deepEqual(second.change('indicator', 'add', ['lipids']).saved, ['lipids', 'glucose']);
  assert.deepEqual(first.change('indicator', 'remove', ['glucose']).saved, ['lipids']);
  assert.deepEqual(second.sync('zhiyu-saved').saved, ['lipids']);
  storage.data.clear();
  assert.deepEqual(first.sync(null).saved, []);
  assert.deepEqual(first.change('indicator', 'add', ['pressure']).saved, ['pressure']);
});
test('blocked storage keeps reversible session edits and warns; malformed data is not overwritten on mount', () => {
  const storage = memory({ 'zhiyu-saved': '{broken' });
  const store = createBookmarkStore(storage);
  assert.equal(store.sync(null).storageError, true);
  assert.equal(storage.getItem('zhiyu-saved'), '{broken');
  storage.setItem = () => { throw new Error('quota'); };
  assert.deepEqual(store.change('indicator', 'toggle', ['glucose']).saved, ['glucose']);
  assert.deepEqual(store.change('indicator', 'toggle', ['glucose']).saved, []);
  assert.equal(store.change('organ', 'add', ['liver']).storageError, true);
});
test('saved lookup paginates past 24, batches past 200 and keeps same-ID kinds separate', async () => {
  const ids = Array.from({ length: 225 }, (_, i) => `item-${i}`);
  const catalog = { categories: [{ id: 'x', name: 'X' }], items: ids.map(id => ({ id, kind: 'organ', category: 'x', title: id })) };
  const calls = [];
  const list = async args => { calls.push(args); return selectPage(catalog, args); };
  const result = await savedContent(list, { kind: 'organ', ids: [...ids, 'withdrawn'], cursor: '222', limit: 6 });
  assert.equal(result.total, 225);
  assert.equal(result.availableIds.length, 225);
  assert.equal(result.items.length, 3);
  assert.equal(result.nextCursor, null);
  assert.ok(calls.every(call => call.ids.length <= 200 && call.limit === 24));
  assert.deepEqual((await savedContent(list, { kind: 'indicator', ids })).availableIds, []);
  assert.equal((await savedContent(list, { kind: 'organ', ids, query: 'item-224' })).total, 1);
});
test('empty saves make no requests; any failed batch or repeated cursor rejects the full result', async () => {
  assert.equal((await savedContent(() => { throw new Error('must not fetch'); }, { kind: 'organ', ids: [] })).total, 0);
  let calls = 0;
  await assert.rejects(savedContent(async () => {
    calls++;
    if (calls === 2) throw new Error('offline');
    return { items: [], categories: [], nextCursor: '24' };
  }, { kind: 'organ', ids: ['liver'] }), /offline/);
  await assert.rejects(savedContent(async () => ({ items: [], categories: [], nextCursor: '0' }), { kind: 'organ', ids: ['liver'] }), /分页异常/);
  const repository = createContentRepository({ apiBase: '/api/demo', fetcher: async () => ({ ok: true, json: async () => ({ items: [{ id: 'liver', kind: 'organ' }], categories: [], nextCursor: null, total: 1 }) }) });
  assert.equal((await repository.saved({ kind: 'organ', ids: ['liver'] })).total, 1);
});
