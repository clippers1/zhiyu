import test from 'node:test';
import assert from 'node:assert/strict';
import { newReceipt, sendFeedback } from '../src/services/feedback.js';

test('receipt codes have 256 bits of random material', () => {
  const codes = Array.from({ length: 100 }, newReceipt);
  assert.ok(codes.every(code => /^[a-f0-9]{64}$/.test(code)));
  assert.equal(new Set(codes).size, 100);
});
test('feedback uses body-only tokens, no cookies or browser caching', async () => {
  const receipt = newReceipt();
  const result = await sendFeedback('status', { receipt }, { base: '/api/feedback', fetcher: async (url, options) => {
    assert.equal(url, '/api/feedback/status'); assert.ok(!url.includes(receipt));
    assert.equal(options.method, 'POST'); assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store');
    assert.deepEqual(JSON.parse(options.body), { receipt });
    return Response.json({ status: 'new' });
  } });
  assert.equal(result.status, 'new');
});
test('error messages support rate limits, changed versions and uncertain network results', async () => {
  await assert.rejects(sendFeedback('submit', {}, { base: '' }), /离线演示/);
  for (const [error, status, message] of [['content_changed', 409, /已更新/], ['rate_limited', 429, /2 分钟/], ['not_found', 404, /未找到反馈/]]) {
    await assert.rejects(sendFeedback('status', {}, { base: '/api/feedback', fetcher: async () => Response.json({ error }, { status, headers: { 'Retry-After': '90' } }) }), message);
  }
  await assert.rejects(sendFeedback('submit', {}, { base: '/api/feedback', fetcher: async () => { throw new TypeError('network'); } }), /保留查询码/);
});
