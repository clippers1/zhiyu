import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeSearch, nearSearch, searchSuggestions } from '../src/services/search.js';
import { selectPage } from '../src/services/content.js';
const catalog = JSON.parse(await readFile('public/content/index.json', 'utf8'));

test('formatting normalization supports case, full width, spaces and dash variants', () => {
  for (const query of ['LDL-C', 'ldlc', 'ＬＤＬ－Ｃ', ' LDL — C ', 'l d l c']) {
    assert.equal(normalizeSearch(query), 'ldlc');
    assert.ok(selectPage(catalog, { query }).items.some(item => item.id === 'lipids'));
  }
  assert.equal(selectPage(catalog, { query: 'blood glucose' }).items[0].id, 'glucose');
  assert.equal(selectPage(catalog, { query: 'ＨｂＡ１ｃ' }).items[0].id, 'glucose');
  assert.equal(selectPage(catalog, { query: '高压' }).items[0].id, 'pressure');
  assert.equal(normalizeSearch(null), '');
});

test('ranking favors direct title and known fields, with stable pagination', () => {
  const data = { categories: [], items: [
    { id: 'body', title: '其他', searchText: '血糖' },
    { id: 'tag', title: '观察', tags: ['血糖'] },
    { id: 'exact', title: '血糖' },
    { id: 'partial', title: '认识血糖' },
  ] };
  assert.deepEqual(selectPage(data, { query: '血糖', limit: 2 }).items.map(x => x.id), ['exact', 'tag']);
  assert.deepEqual(selectPage(data, { query: '血糖', limit: 2, cursor: '2' }).items.map(x => x.id), ['partial', 'body']);
  assert.equal(selectPage(data, { query: '血糖' }).items[0].match, '标题');
});

test('suggestions are explicit, bounded and use available terms without correcting short medical words', () => {
  assert.ok(nearSearch('glcuose', 'glucose'));
  assert.ok(nearSearch('glucos', 'glucose'));
  assert.equal(nearSearch('hdl', 'ldl'), false);
  assert.equal(nearSearch('血糖', '血脂'), false);
  assert.equal(nearSearch('glucose', 'glucose'), false);
  const page = selectPage(catalog, { query: 'glcuose' });
  assert.equal(page.total, 0);
  assert.ok(page.suggestions.includes('BLOOD GLUCOSE'));
  assert.deepEqual(selectPage(catalog, { query: 'glcuose', ids: [] }).suggestions, []);
  assert.deepEqual(selectPage(catalog, { query: 'glcuose', category: 'circulation' }).suggestions, []);
  assert.deepEqual(searchSuggestions([], 'glcuose'), []);
});

test('punctuation and unsupported characters never turn into match-all searches', () => {
  for (const query of ['%', '_', '---', '😀', '<>']) assert.equal(selectPage(catalog, { query }).total, 0);
  assert.equal(selectPage(catalog, { query: '   ' }).total, catalog.items.length);
  assert.equal(selectPage(catalog, { query: "' OR 1=1 --" }).total, 0);
});
