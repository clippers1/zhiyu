import assert from 'node:assert/strict';
import { getPayload, createLocalReq } from 'payload';
import config from '../src/payload.config';
import { publicContent } from '../src/public-api';
import { selectPage } from '../reader/services/content.js';

if (new URL(process.env.DATABASE_URI || '').pathname !== '/zhiyu_test') throw new Error('Search tests require isolated zhiyu_test.');
process.env.ENABLE_DEMO_API = 'true';
const payload = await getPayload({ config });
let checks = 0;
const pass = (name: string) => { checks++; console.log(`PASS ${name}`); };
const api = async (options: Record<string, any> = {}, channel: 'demo' | 'official' = 'demo') => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  const response = await publicContent(new Request(`http://localhost/api/content?${params}`), channel, ['content']);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return { response, data: await response.json() };
};
try {
  const publications = await payload.find({ collection: 'publications', depth: 0, overrideAccess: true, limit: 200,
    where: { and: [{ channel: { equals: 'demo' } }, { withdrawn: { equals: false } }] }, sort: 'id' });
  const catalog = { items: publications.docs.map(doc => doc.summary), categories: [] };
  for (const query of ['血糖', '高压', 'blood glucose', 'ＬＤＬ－Ｃ', 'l d l c', 'ＨｂＡ１ｃ', 'glcuose', '%', '_', '---', '😀', "' OR 1=1 --", '无此内容']) {
    for (const options of [{ query }, { query, kind: 'indicator', limit: 1, cursor: '1' }, { query, ids: [] }, { query, category: 'circulation' }]) {
      const { response, data } = await api(options);
      const expected = selectPage(catalog, options);
      assert.equal(response.status, 200);
      assert.deepEqual(data.items.map((x: any) => [x.id, x.match]), expected.items.map((x: any) => [x.id, x.match]), `${query}: SQL/static parity`);
      assert.equal(data.total, expected.total);
      assert.equal(data.nextCursor, expected.nextCursor);
      assert.deepEqual(data.suggestions, expected.suggestions);
      assert.ok(data.items.every((item: any) => !('searchText' in item)));
    }
  }
  assert.equal((await api({ query: '血糖' })).data.items[0].id, 'glucose');
  assert.equal((await api({ query: 'LDL-C' }, 'official')).data.total, 0);
  assert.equal((await api({ query: 'glcuose' }, 'official')).data.suggestions.length, 0);
  assert.equal((await api({ query: 'x'.repeat(201) })).response.status, 400);
  pass('SQL/static parity, normalization, ranking, pagination, filters, suggestions, injection-shaped input and channel isolation');

  const admin: any = (await payload.find({ collection: 'users', where: { roles: { contains: 'admin' } }, limit: 1 })).docs[0];
  const req = () => createLocalReq({ user: { ...admin, collection: 'users' } }, payload);
  const publication: any = publications.docs.find((doc: any) => doc.key === 'demo:indicator:glucose');
  const article: any = (await payload.find({ collection: 'articles', where: { key: { equals: 'indicator:glucose' } }, depth: 0, limit: 1 })).docs[0];
  const marker = 'syntheticsearchalias';
  try {
    await payload.update({ collection: 'articles', id: article.id, req: await req(), data: { aliases: `${article.aliases || ''} ${marker}` } });
    assert.equal((await api({ query: marker })).data.total, 0);
    const release: any = await payload.create({ collection: 'releases', req: await req(), data: { article: article.id, channel: 'demo' } });
    await payload.update({ collection: 'publications', id: publication.id, req: await req(), data: { release: release.id, reason: 'Isolated synthetic search test' } });
    assert.equal((await api({ query: marker })).data.items[0].id, 'glucose');
    await payload.update({ collection: 'publications', id: publication.id, req: await req(), data: { release: publication.release, reason: 'Isolated search rollback' } });
    assert.equal((await api({ query: marker })).data.total, 0);
    await payload.update({ collection: 'publications', id: publication.id, req: await req(), data: { withdrawn: true, reason: 'Isolated search withdrawal' } });
    assert.equal((await api({ query: 'blood glucose' })).data.total, 0);
    assert.ok(!(await api({ query: 'glcuose' })).data.suggestions.includes('BLOOD GLUCOSE'));
    pass('draft aliases stay private; release, rollback and withdrawal update matches and suggestions without reindexing');
  } finally {
    await payload.update({ collection: 'articles', id: article.id, req: await req(), data: { aliases: article.aliases } });
    await payload.update({ collection: 'publications', id: publication.id, req: await req(), data: { release: publication.release, withdrawn: false, reason: 'Restore isolated search fixture' } });
  }
  console.log(`${checks} search integration groups passed.`);
} finally { await payload.destroy(); }
process.exit(0);
