import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { getPayload, createLocalReq } from 'payload';
import config from '../src/payload.config';
import { publicContent } from '../src/public-api';

if (!new URL(process.env.DATABASE_URI || '').pathname.endsWith('/zhiyu_test')) throw new Error('Workflow tests require the isolated zhiyu_test database. Never run against production.');
const payload = await getPayload({ config });
const suffix = Date.now().toString(36);
const password = randomBytes(24).toString('hex');
let checks = 0;
const passed = (label: string) => { checks++; console.log(`PASS ${label}`); };
try {
  const admin: any = await payload.create({ collection: 'users', context: { bootstrap: true }, data: {
    name: 'Synthetic test administrator', email: `admin-${suffix}@example.test`, password, roles: ['admin'],
  } });
  const adminReq = await createLocalReq({ user: { ...admin, collection: 'users' } }, payload);
  const editor: any = await payload.create({ collection: 'users', req: adminReq, overrideAccess: false, data: {
    name: 'Synthetic test editor', email: `editor-${suffix}@example.test`, password, roles: ['editor'],
  } });
  const reviewer: any = await payload.create({ collection: 'users', req: adminReq, overrideAccess: false, data: {
    name: 'Synthetic test reviewer — not a clinician', email: `reviewer-${suffix}@example.test`, password,
    roles: ['reviewer'], qualificationVerified: true, qualificationNotes: 'Synthetic fixture exclusively in isolated test database; not actual medical credentials.',
  } });
  const unverified: any = await payload.create({ collection: 'users', req: adminReq, overrideAccess: false, data: {
    name: 'Unverified test reviewer', email: `unverified-${suffix}@example.test`, password, roles: ['reviewer'],
  } });
  const editorReq = await createLocalReq({ user: { ...editor, collection: 'users' } }, payload);
  const reviewerReq = await createLocalReq({ user: { ...reviewer, collection: 'users' } }, payload);
  const unverifiedReq = await createLocalReq({ user: { ...unverified, collection: 'users' } }, payload);
  const anonymous = await createLocalReq({}, payload);

  await assert.rejects(payload.create({ collection: 'users', req: anonymous, overrideAccess: false, data: { name: 'Attacker', email: `bad-${suffix}@example.test`, password, roles: ['admin'] } }));
  const own: any = await payload.update({ collection: 'users', id: editor.id, req: editorReq, overrideAccess: false, data: { roles: ['admin'], qualificationVerified: true, name: 'Editor renamed' } });
  assert.deepEqual(own.roles, ['editor']); assert.equal(own.qualificationVerified, false);
  passed('anonymous signup and role / reviewer-qualification escalation blocked');

  await payload.create({ collection: 'categories', req: adminReq, data: { slug: `test-${suffix}`, name: 'Synthetic category' } });
  const source: any = await payload.create({ collection: 'sources', req: editorReq, overrideAccess: false, data: {
    title: 'Synthetic reference', publisher: 'Test fixture', url: `https://example.org/${suffix}`, sourceType: '其他',
    language: 'en', checkedAt: new Date().toISOString(), licenseStatus: 'citation-only', licenseNotes: 'Synthetic original test text only.',
  } });
  const article: any = await payload.create({ collection: 'articles', req: editorReq, overrideAccess: false, data: {
    kind: 'indicator', slug: `test-${suffix}`, title: '测试知识', subtitle: 'Synthetic fixture only', english: 'TEST',
    category: `test-${suffix}`, applicability: 'Synthetic test users only, not medical content.', scopeConfirmed: true,
    description: 'Version one', descriptionSourceKeys: 'ref', aliases: 'TESTSEARCH 别名',
    metrics: [{ name: 'Synthetic metric', text: 'Test content', sourceKeys: 'ref' }],
    chain: [{ text: 'Test step' }], chainSourceKeys: 'ref', tip: 'Not medical advice', tipSourceKeys: 'ref',
    citations: [{ key: 'ref', source: source.id, scope: 'Synthetic claim', locator: 'Test paragraph' }],
  } });
  await assert.rejects(payload.findByID({ collection: 'articles', id: article.id, req: anonymous, overrideAccess: false }));
  await assert.rejects(payload.create({ collection: 'reviews', req: unverifiedReq, overrideAccess: false, data: { article: article.id, decision: 'approved', notes: 'must fail' } }));
  passed('drafts private and unverified medical reviewers blocked');

  await assert.rejects(payload.create({ collection: 'releases', req: adminReq, data: { article: article.id, channel: 'official' } }));
  const demo: any = await payload.create({ collection: 'releases', req: adminReq, data: { article: article.id, channel: 'demo' } });
  await payload.create({ collection: 'publications', req: adminReq, data: { release: demo.id, reason: 'Synthetic demo' } });
  const api = async (channel: 'demo' | 'official', segments: string[], query = '') => publicContent(new Request(`http://localhost/api/${channel}/${segments.join('/')}${query}`), channel, segments);
  assert.equal((await api('official', ['content', 'indicator', article.slug])).status, 404);
  const demoResponse = await api('demo', ['content', 'indicator', article.slug]);
  assert.equal(demoResponse.headers.get('Cache-Control'), 'no-store');
  const demoBody = await demoResponse.json(); assert.equal(demoBody.reviewStatus, 'pending'); assert.equal(demoBody.demo, true);
  assert.equal(demoBody.references[0].licenseNotes, undefined);
  passed('demo isolated from formal API, always pending, without private license notes');

  const selfArticle: any = await payload.create({ collection: 'articles', req: reviewerReq, overrideAccess: true, data: {
    kind: 'indicator', slug: `self-${suffix}`, title: 'Self review test', subtitle: 'Synthetic fixture',
    category: `test-${suffix}`, applicability: 'Test only', description: 'Self authored fixture',
    citations: [{ key: 'ref', source: source.id, scope: 'Synthetic', locator: 'Paragraph' }],
  } });
  await assert.rejects(payload.create({ collection: 'reviews', req: reviewerReq, overrideAccess: false, data: { article: selfArticle.id, decision: 'approved', notes: 'must fail' } }));
  const review: any = await payload.create({ collection: 'reviews', req: reviewerReq, overrideAccess: false, data: { article: article.id, decision: 'approved', notes: 'Synthetic workflow test approval, not a medical review.' } });
  await assert.rejects(payload.update({ collection: 'reviews', id: review.id, req: adminReq, overrideAccess: false, data: { notes: 'tamper' } }));
  passed('independent, qualified, immutable review bound to a content/source hash');

  await payload.update({ collection: 'articles', id: article.id, req: editorReq, overrideAccess: false, data: { description: 'Changed after review' } });
  await assert.rejects(payload.create({ collection: 'releases', req: adminReq, data: { article: article.id, channel: 'official', review: review.id } }));
  const freshReview: any = await payload.create({ collection: 'reviews', req: reviewerReq, overrideAccess: false, data: { article: article.id, decision: 'approved', notes: 'Synthetic revised version approved for tests only.' } });
  await payload.update({ collection: 'sources', id: source.id, req: editorReq, data: { title: 'Changed source' } });
  await assert.rejects(payload.create({ collection: 'releases', req: adminReq, data: { article: article.id, channel: 'official', review: freshReview.id } }));
  passed('content edits and source edits both invalidate earlier approvals for new releases');

  const finalReview: any = await payload.create({ collection: 'reviews', req: reviewerReq, overrideAccess: false, data: { article: article.id, decision: 'approved', notes: 'Synthetic final version review.' } });
  const release: any = await payload.create({ collection: 'releases', req: adminReq, data: { article: article.id, channel: 'official', review: finalReview.id } });
  await assert.rejects(payload.update({ collection: 'releases', id: release.id, req: adminReq, overrideAccess: false, data: { publicData: {} } }));
  const publication: any = await payload.create({ collection: 'publications', req: adminReq, data: { release: release.id, reason: 'Synthetic official publication' } });
  assert.equal((await (await api('official', ['content', 'indicator', article.slug])).json()).desc, 'Changed after review');
  const list = await (await api('official', ['content'], '?query=testsearch&limit=6')).json();
  assert.ok(list.items.some((x: any) => x.id === article.slug)); assert.equal(list.items[0].desc, undefined); assert.equal(list.items[0].searchText, undefined);
  const emptySaved = await (await api('official', ['content'], '?ids=')).json(); assert.equal(emptySaved.total, 0); assert.ok(emptySaved.categories.length > 0);
  passed('formal publish, case-insensitive aliases, summary-only lists and empty saved lists');

  await payload.update({ collection: 'articles', id: article.id, req: editorReq, data: { description: 'Future draft not public' } });
  assert.equal((await (await api('official', ['content', 'indicator', article.slug])).json()).desc, 'Changed after review');
  await payload.update({ collection: 'sources', id: source.id, req: editorReq, data: { title: 'Future source draft' } });
  assert.equal((await (await api('official', ['content', 'indicator', article.slug])).json()).references[0].title, 'Changed source');
  const nextReview: any = await payload.create({ collection: 'reviews', req: reviewerReq, overrideAccess: false, data: { article: article.id, decision: 'approved', notes: 'Synthetic next revision.' } });
  const nextRelease: any = await payload.create({ collection: 'releases', req: adminReq, data: { article: article.id, channel: 'official', review: nextReview.id } });
  await payload.update({ collection: 'publications', id: publication.id, req: adminReq, data: { release: nextRelease.id, reason: 'Switch forward' } });
  assert.equal((await (await api('official', ['content', 'indicator', article.slug])).json()).desc, 'Future draft not public');
  await payload.update({ collection: 'publications', id: publication.id, req: adminReq, data: { release: release.id, reason: 'Rollback test' } });
  assert.equal((await (await api('official', ['content', 'indicator', article.slug])).json()).desc, 'Changed after review');
  passed('draft/source isolation, revision switch and rollback preserve exact approved snapshots');

  await assert.rejects(payload.update({ collection: 'publications', id: publication.id, req: editorReq, overrideAccess: false, data: { withdrawn: true, reason: 'unauthorized' } }));
  await payload.update({ collection: 'publications', id: publication.id, req: adminReq, data: { withdrawn: true, reason: 'Withdrawal test' } });
  assert.equal((await api('official', ['content', 'indicator', article.slug])).status, 404);
  assert.equal((await (await api('official', ['content'], `?ids=${article.slug}`)).json()).total, 0);
  const audits = await payload.find({ collection: 'audit-events', where: { target: { equals: `publications:${publication.id}` } } });
  assert.ok(audits.docs.some((x: any) => x.action === 'withdraw'));
  await assert.rejects(payload.create({ collection: 'audit-events', req: adminReq, overrideAccess: false, data: { action: 'fake', target: 'fake' } }));
  passed('authorized immediate withdrawal, list/detail consistency and append-only audit');
  console.log(`${checks} workflow groups passed in isolated test database.`);
} finally { await payload.destroy(); }
process.exit(0);
