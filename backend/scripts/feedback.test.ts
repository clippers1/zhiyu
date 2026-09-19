import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { createLocalReq, getPayload } from 'payload';
import config from '../src/payload.config';
import { feedbackAPI, consumeFeedbackLimit } from '../src/feedback-api';
import { snapshotArticle, validateForReview } from '../src/domain';

if (new URL(process.env.DATABASE_URI || '').pathname !== '/zhiyu_test') throw new Error('Feedback tests require the isolated zhiyu_test database.');
const payload = await getPayload({ config });
const suffix = randomBytes(6).toString('hex');
const password = randomBytes(24).toString('hex');
const token = () => randomBytes(32).toString('hex');
const origin = new URL(process.env.SERVER_URL || 'http://localhost:3108').origin;
let address = 0;
const request = (action: string, body: any, headers = {}) => new Request(`${origin}/api/feedback/${action}`, {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Real-IP': `192.0.2.${++address}`, ...headers }, body: JSON.stringify(body),
});
const api = (action: string, body: any, headers = {}) => feedbackAPI(request(action, body, headers), action);
let checks = 0;
const passed = (label: string) => { checks++; console.log(`PASS ${label}`); };
try {
  process.env.FEEDBACK_TRUST_PROXY = 'true';
  process.env.ENABLE_DEMO_API = 'true';
  await payload.db.pool.query('DELETE FROM feedback_throttles');
  const admin: any = await payload.create({ collection: 'users', context: { bootstrap: true }, data: { name: 'Synthetic feedback admin', email: `feedback-${suffix}@example.test`, password, roles: ['admin'] } });
  const adminReq = await createLocalReq({ user: { ...admin, collection: 'users' } }, payload);
  const editor: any = await payload.create({ collection: 'users', req: adminReq, data: { name: 'Synthetic feedback editor', email: `feedback-editor-${suffix}@example.test`, password, roles: ['editor'] } });
  const reviewer: any = await payload.create({ collection: 'users', req: adminReq, data: { name: 'Synthetic reviewer', email: `feedback-reviewer-${suffix}@example.test`, password, roles: ['reviewer'] } });
  const editorReq = await createLocalReq({ user: { ...editor, collection: 'users' } }, payload);
  const reviewerReq = await createLocalReq({ user: { ...reviewer, collection: 'users' } }, payload);
  const anonymous = await createLocalReq({}, payload);
  await payload.create({ collection: 'categories', req: adminReq, data: { slug: `feedback-${suffix}`, name: 'Synthetic category' } });
  const source: any = await payload.create({ collection: 'sources', req: adminReq, data: {
    title: 'Synthetic source', publisher: 'Test only', url: `https://example.org/feedback-${suffix}`, checkedAt: '2025-01-01T00:00:00.000Z',
    sourceType: '其他', language: 'en', availability: 'available', nextReviewAt: '2025-06-01T00:00:00.000Z', licenseStatus: 'citation-only', licenseNotes: 'Synthetic test text only.',
  } });
  const article: any = await payload.create({ collection: 'articles', req: adminReq, data: {
    kind: 'organ', slug: `feedback-${suffix}`, title: 'Synthetic feedback content', subtitle: 'Not medical content', category: `feedback-${suffix}`,
    applicability: 'Test fixtures only', scopeConfirmed: true, description: 'Synthetic test description', descriptionSourceKeys: 'ref',
    citations: [{ key: 'ref', source: source.id, scope: 'Synthetic fixture', locator: 'Test paragraph' }],
  } });
  const release: any = await payload.create({ collection: 'releases', req: adminReq, data: { article: article.id, channel: 'demo' } });
  const publication: any = await payload.create({ collection: 'publications', req: adminReq, data: { release: release.id, reason: 'Synthetic feedback workflow' } });
  const body = { receipt: token(), kind: 'organ', slug: article.slug, channel: 'demo', releaseID: release.id, category: 'accuracy', message: 'Synthetic issue for automated testing only.', consent: true };

  assert.equal((await api('submit', body, { Origin: 'https://attacker.example' })).status, 403);
  assert.equal((await api('submit', body, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await feedbackAPI(new Request(`${origin}/api/feedback/status`), 'status')).status, 405);
  assert.equal((await api('submit', { ...body, consent: false })).status, 400);
  assert.equal((await api('submit', { ...body, message: 'short' })).status, 400);
  assert.equal((await api('submit', { ...body, message: 'x'.repeat(9000) })).status, 413);
  assert.equal((await api('submit', { ...body, receipt: 'guessable' })).status, 400);
  passed('same-origin JSON, consent, content length and cryptographic receipt validation');

  assert.equal((await api('submit', { ...body, channel: 'official' })).status, 404);
  assert.equal((await api('submit', { ...body, releaseID: release.id + 100000 })).status, 409);
  process.env.ENABLE_DEMO_API = 'false';
  assert.equal((await api('submit', body)).status, 404);
  process.env.ENABLE_DEMO_API = 'true';
  const created = await api('submit', body);
  assert.equal(created.status, 201); assert.equal(created.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await created.json(), { received: true });
  assert.equal((await api('submit', body)).status, 200);
  assert.equal((await api('submit', { ...body, message: 'A different synthetic issue under the same code.' })).status, 409);
  const receiptHash = createHash('sha256').update(body.receipt).digest('hex');
  const tickets = await payload.find({ collection: 'feedback', depth: 0, where: { receiptHash: { equals: receiptHash } } });
  assert.equal(tickets.totalDocs, 1);
  const ticket: any = tickets.docs[0];
  assert.equal(ticket.release, release.id); assert.equal(ticket.status, 'new');
  assert.ok(!JSON.stringify(ticket).includes(body.receipt));
  passed('visible channel/version binding, demo opt-in and idempotent submissions store only a token hash');

  await assert.rejects(payload.find({ collection: 'feedback', req: anonymous, overrideAccess: false }));
  await assert.rejects(payload.find({ collection: 'feedback', req: reviewerReq, overrideAccess: false }));
  await assert.rejects(payload.create({ collection: 'feedback', req: adminReq, overrideAccess: false, data: ticket }));
  await assert.rejects(payload.find({ collection: 'feedback-throttles', req: adminReq, overrideAccess: false }));
  const visible: any = await payload.findByID({ collection: 'feedback', id: ticket.id, req: editorReq, overrideAccess: false, depth: 0 });
  assert.equal(visible.receiptHash, undefined);
  await assert.rejects(payload.update({ collection: 'feedback', id: ticket.id, req: editorReq, overrideAccess: false, data: { message: 'Tampered original question' } }));
  await assert.rejects(payload.update({ collection: 'feedback', id: ticket.id, req: editorReq, overrideAccess: false, data: { release: release.id + 1 } }));
  await assert.rejects(payload.update({ collection: 'feedback', id: ticket.id, req: editorReq, overrideAccess: false, data: { status: 'resolved' } }));
  passed('private queue and rate counters, immutable original report and required closing explanation');

  await payload.update({ collection: 'feedback', id: ticket.id, req: editorReq, overrideAccess: false, data: {
    assignedTo: editor.id, status: 'triaging', internalNotes: 'PRIVATE_INTERNAL_NOTES', publicReply: 'We are checking the synthetic issue.',
  } });
  const statusResponse = await api('status', { receipt: body.receipt });
  assert.equal(statusResponse.status, 200);
  const status = await statusResponse.json();
  assert.deepEqual(Object.keys(status).sort(), ['status', 'publicReply', 'contentTitle', 'version', 'createdAt', 'updatedAt'].sort());
  assert.equal(status.status, 'triaging'); assert.equal(status.version, release.id);
  assert.ok(!JSON.stringify(status).includes('PRIVATE_INTERNAL_NOTES'));
  assert.ok(!JSON.stringify(status).includes(body.message));
  assert.equal((await api('status', { receipt: token() })).status, 404);
  await payload.update({ collection: 'feedback', id: ticket.id, req: editorReq, overrideAccess: false, data: { status: 'resolved', publicReply: 'Synthetic check finished; no actual medical conclusions.' } });
  const audits = await payload.find({ collection: 'audit-events', where: { target: { equals: `feedback:${ticket.id}` } } });
  assert.ok(audits.docs.some((event: any) => event.action === 'feedback-update'));
  passed('assignment, restricted status/reply projection and handling audit');

  await payload.update({ collection: 'publications', id: publication.id, req: adminReq, data: { withdrawn: true, reason: 'Test withdrawal' } });
  assert.equal((await api('submit', { ...body, receipt: token() })).status, 404);
  assert.equal((await api('submit', body)).status, 200);
  assert.equal((await api('status', { receipt: body.receipt })).status, 200);
  await assert.rejects(payload.delete({ collection: 'feedback', id: ticket.id, req: editorReq, overrideAccess: false }));
  assert.equal((await api('delete', { receipt: token() })).status, 404);
  assert.equal((await api('delete', { receipt: body.receipt })).status, 200);
  assert.equal((await api('status', { receipt: body.receipt })).status, 404);
  const deletionAudit = await payload.find({ collection: 'audit-events', where: { target: { equals: `feedback:${ticket.id}` } } });
  assert.ok(deletionAudit.docs.some((event: any) => event.action === 'feedback-delete'));
  assert.ok(!JSON.stringify(deletionAudit.docs).includes(body.message));
  passed('withdrawal stops new reports but preserves status access; receipt-authorized deletion removes original text');

  // Each snapshot models a new HTTP request; do not reuse Payload's per-request relation cache.
  const freshSnapshot = async () => snapshotArticle(await createLocalReq({ user: { ...admin, collection: 'users' } }, payload), article.id);
  const snapshot = await freshSnapshot();
  validateForReview(snapshot);
  await payload.update({ collection: 'sources', id: source.id, req: adminReq, data: { nextReviewAt: '2027-01-01T00:00:00.000Z' } });
  assert.equal((await freshSnapshot()).hash, snapshot.hash, 'Scheduling must not invalidate medical review');
  await assert.rejects(payload.update({ collection: 'sources', id: source.id, req: adminReq, data: { nextReviewAt: '2024-01-01T00:00:00.000Z' } }));
  await assert.rejects(payload.update({ collection: 'sources', id: source.id, req: adminReq, data: { availability: 'unavailable' } }));
  await payload.update({ collection: 'sources', id: source.id, req: adminReq, data: { availability: 'changed', reviewNotes: 'Synthetic upstream change' } });
  const changed = await freshSnapshot();
  assert.notEqual(changed.hash, snapshot.hash); assert.throws(() => validateForReview(changed));
  const affected = await payload.count({ collection: 'articles', where: { 'citations.source': { equals: source.id } } });
  assert.equal(affected.totalDocs, 1);
  passed('review scheduling is not medical approval; changed/unavailable sources prevent approval and expose affected drafts');

  const rateRequest = request('submit', {}, { 'X-Real-IP': '198.51.100.17' });
  const rates = await Promise.all(Array.from({ length: 9 }, () => consumeFeedbackLimit(payload, rateRequest, 'submit')));
  assert.equal(rates.filter(result => result.allowed).length, 5);
  const limited = await api('submit', body, { 'X-Real-IP': '198.51.100.17' });
  assert.equal(limited.status, 429); assert.ok(Number(limited.headers.get('retry-after')) > 0);
  assert.equal((await consumeFeedbackLimit(payload, request('submit', {}, { 'X-Real-IP': '198.51.100.18' }), 'submit')).allowed, true);
  process.env.FEEDBACK_TRUST_PROXY = 'false';
  const shared = await Promise.all(Array.from({ length: 7 }, () => consumeFeedbackLimit(payload, request('submit', {}), 'submit')));
  assert.equal(shared.filter(result => result.allowed).length, 5);
  const counters = await payload.db.pool.query('SELECT key, reset_at FROM feedback_throttles');
  assert.ok(counters.rows.every((row: any) => /^[a-f0-9]{64}$/.test(row.key)));
  passed('atomic shared rate limits, Retry-After and untrusted-header fallback without raw IP storage');
  console.log(`${checks} feedback/maintenance groups passed in isolated test database.`);
} finally { await payload.destroy(); }
process.exit(0);
