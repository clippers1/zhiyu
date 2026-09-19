import test from 'node:test';
import assert from 'node:assert/strict';
import jsQR from 'jsqr';
import { shareCardModel, qrMatrix, wrapCardText } from '../src/services/share.js';
import { createContentRepository } from '../src/services/content.js';

const content = { kind: 'indicator', id: 'glucose', title: '血糖', subtitle: '认识概念', version: 1, updatedAt: '2026-09-19', reviewStatus: 'pending', references: [{ id: 'a' }] };
test('share refresh bypasses both the bundled detail cache and browser HTTP cache', async () => {
  const calls = [];
  let withdrawn = false;
  const repository = createContentRepository({ fetcher: async (url, options) => {
    calls.push(options);
    return { ok: !withdrawn, status: withdrawn ? 404 : 200, json: async () => content };
  } });
  await repository.get('indicator', 'glucose');
  await repository.get('indicator', 'glucose');
  assert.equal(calls.length, 1);
  await repository.get('indicator', 'glucose', { refresh: true });
  assert.equal(calls[1].cache, 'no-store');
  withdrawn = true;
  await assert.rejects(repository.get('indicator', 'glucose', { refresh: true }), /不存在/);
});
test('cards use clean typed URLs and only an explicit subset of public fields', () => {
  const card = shareCardModel({ ...content, desc: 'private body', search: 'private query' }, 'https://user:password@example.test/private?token=secret#private', new Date('2026-09-19T00:00:00Z'));
  assert.equal(card.url, 'https://example.test/article/glucose');
  assert.equal(card.filename, 'zhiyu-indicator-glucose.png');
  assert.equal(card.referenceCount, 1);
  assert.match(card.status, /待专业审校/);
  assert.ok(!JSON.stringify(card).includes('private') && !JSON.stringify(card).includes('secret'));
  assert.equal(shareCardModel({ ...content, kind: 'organ', id: 'liver', name: '肝脏', headline: '基本功能' }, 'https://example.test').url, 'https://example.test/organs/liver');
  assert.throws(() => shareCardModel(content, 'javascript:alert(1)'));
  assert.throws(() => shareCardModel({ ...content, id: '../admin' }, 'https://example.test'));
});
test('review status is conservative; merely declaring reviewed without a public review is not enough', () => {
  assert.equal(shareCardModel({ ...content, reviewStatus: 'reviewed' }, 'https://example.test').reviewed, false);
  assert.equal(shareCardModel({ ...content, reviewStatus: 'reviewed', review: { name: 'Synthetic reviewer' } }, 'https://example.test').reviewed, true);
  const card = shareCardModel({ ...content, title: '\u202e血糖\n知识', subtitle: 'x'.repeat(10000), updatedAt: '' }, 'https://example.test');
  assert.ok(!card.title.includes('\u202e'));
  assert.equal(card.subtitle.length, 300);
  assert.equal(card.updatedAt, '未标注');
});
test('bounded wrapping never lets a long line cover required warnings', () => {
  const measure = value => Array.from(value).length * 10;
  const lines = wrapCardText('一二三四五六七八九十十一十二十三十四', measure, 50, 2);
  assert.equal(lines.length, 2);
  assert.ok(lines.every(line => measure(line) <= 50));
  assert.ok(lines[1].endsWith('…'));
  assert.deepEqual(wrapCardText('短文本', measure, 50, 2), ['短文本']);
  assert.deepEqual(wrapCardText('', measure, 50, 2), []);
});
test('QR matrix is independently decodable with a four-module quiet zone', () => {
  const url = 'https://zhiyu.example.test/article/glucose';
  const matrix = qrMatrix(url), cell = 6, quiet = 4;
  const size = (matrix.length + quiet * 2) * cell;
  const rgba = new Uint8ClampedArray(size * size * 4).fill(255);
  matrix.forEach((row, r) => row.forEach((dark, c) => {
    if (!dark) return;
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
      const offset = (((r + quiet) * cell + y) * size + (c + quiet) * cell + x) * 4;
      rgba[offset] = rgba[offset + 1] = rgba[offset + 2] = 0;
    }
  }));
  assert.equal(jsQR(rgba, size, size)?.data, url);
});
