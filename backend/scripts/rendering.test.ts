import assert from 'node:assert/strict';
import { createLocalReq, getPayload } from 'payload';
import config from '../src/payload.config';
import { buildPage, pageMetadata, sitemapXML } from '../src/site';

if (new URL(process.env.DATABASE_URI || '').pathname !== '/zhiyu_test') throw new Error('Rendering tests require the isolated zhiyu_test database, seeded with demo topics.');
const payload = await getPayload({ config });
const base = process.env.RENDER_TEST_BASE_URL;
if (base && !['localhost', '127.0.0.1', 'zhiyu-beta4-preview'].includes(new URL(base).hostname)) throw new Error('HTTP mutation tests may only target a local preview.');
process.env.SITE_CONTENT_CHANNEL = 'demo';
process.env.ENABLE_DEMO_API = 'true';
let checks = 0;
const passed = (label: string) => { checks++; console.log(`PASS ${label}`); };
const request = async (path: string) => {
  const response = await fetch(`${base}${path}`, { redirect: 'manual' });
  return { response, html: await response.text() };
};
try {
  const admin: any = (await payload.find({ collection: 'users', where: { roles: { contains: 'admin' } }, limit: 1 })).docs[0];
  const req = () => createLocalReq({ user: { ...admin, collection: 'users' } }, payload);
  const article: any = (await payload.find({ collection: 'articles', where: { key: { equals: 'indicator:glucose' } }, depth: 0, limit: 1 })).docs[0];
  const publication: any = (await payload.find({ collection: 'publications', where: { key: { equals: 'demo:indicator:glucose' } }, depth: 0, limit: 1 })).docs[0];
  assert.ok(admin && article && publication, 'Seed demo content before rendering tests');
  const previousRelease = publication.release;
  const previousDescription = article.description;
  const previousTitle = article.title;
  const previousSubtitle = article.subtitle;
  try {
    const initial = await buildPage('/article/glucose');
    assert.equal(initial?.detail.releaseID, previousRelease);
    assert.equal(initial?.detail.reviewStatus, 'pending');
    assert.ok(initial?.preloaded['get:["indicator","glucose"]']);
    assert.equal((pageMetadata(initial).robots as any).index, false);
    assert.equal((await buildPage('/saved'))?.detail, null);
    assert.deepEqual((await buildPage('/saved'))?.preloaded, {});
    assert.equal(await buildPage('/article/not-real'), null);
    assert.equal(await buildPage('/unknown-route'), null);
    assert.ok(!(await sitemapXML()).includes('<url>'));
    passed('published-only bootstrap, demo noindex, empty demo sitemap and private saved-page shell');

    await payload.update({ collection: 'articles', id: article.id, req: await req(), data: { title: 'SSR_SYNTHETIC_TITLE', subtitle: 'SSR_SYNTHETIC_SUMMARY', description: 'SSR_SYNTHETIC_BODY <script>not executable</script>' } });
    assert.equal((await buildPage('/article/glucose'))?.detail.title, previousTitle, 'Draft edits must not change public metadata');
    const release: any = await payload.create({ collection: 'releases', req: await req(), data: { article: article.id, channel: 'demo' } });
    await payload.update({ collection: 'publications', id: publication.id, req: await req(), data: { release: release.id, reason: 'Isolated SSR synthetic publication test' } });
    const updated = await buildPage('/article/glucose');
    assert.equal(updated?.detail.releaseID, release.id);
    assert.equal(updated?.detail.title, 'SSR_SYNTHETIC_TITLE');
    assert.match(String(pageMetadata(updated).title), /SSR_SYNTHETIC_TITLE/);
    assert.match(String(pageMetadata(updated).description), /SSR_SYNTHETIC_SUMMARY/);
    assert.ok(!JSON.stringify(updated).includes('licenseNotes'));
    assert.ok(!JSON.stringify(updated).includes('sourceRecordID'));
    if (base) {
      const { response, html } = await request('/article/glucose');
      assert.equal(response.status, 200); assert.match(response.headers.get('cache-control') || '', /no-store/);
      assert.match(html, /<title>SSR_SYNTHETIC_TITLE/);
      assert.match(html, /<meta property="og:title" content="SSR_SYNTHETIC_TITLE/);
      assert.match(html, /SSR_SYNTHETIC_BODY &lt;script&gt;not executable&lt;\/script&gt;/);
      assert.ok(!html.includes('<script>not executable</script>'));
    }
    passed('draft isolation and publication synchronize body, title, metadata and escaped HTML');

    await payload.update({ collection: 'publications', id: publication.id, req: await req(), data: { release: previousRelease, reason: 'Isolated SSR rollback test' } });
    assert.equal((await buildPage('/article/glucose'))?.detail.title, previousTitle);
    if (base) {
      const { response, html } = await request('/article/glucose');
      assert.equal(response.status, 200); assert.ok(!html.includes('SSR_SYNTHETIC_TITLE'));
    }
    await payload.update({ collection: 'publications', id: publication.id, req: await req(), data: { withdrawn: true, reason: 'Isolated SSR withdrawal test' } });
    assert.equal(await buildPage('/article/glucose'), null);
    if (base) {
      for (const path of ['/article/glucose', '/article/not-real', '/unknown-route']) {
        const { response, html } = await request(path);
        assert.equal(response.status, 404, `${path} must not be a soft 404`);
        assert.ok(!html.includes('SSR_SYNTHETIC_BODY'));
        assert.ok(!html.includes('认识血糖'));
      }
      assert.equal((await request('/api/demo/content/indicator/glucose')).response.status, 404);
      assert.ok(!(await request('/')).html.includes('href="/article/glucose"'));
    }
    passed('rollback has no stale metadata; withdrawal removes HTML/API/list exposure and returns real 404');

    const organPublication: any = (await payload.find({ collection: 'publications', where: { key: { equals: 'demo:organ:heart' } }, depth: 0, limit: 1 })).docs[0];
    assert.ok(organPublication, 'Seed the heart demo before entry tests');
    const organKey = 'list:[{"kind":"organ","limit":24}]';
    assert.ok((await buildPage('/'))?.preloaded[organKey].items.some((item: any) => item.id === 'heart'));
    try {
      await payload.update({ collection: 'publications', id: organPublication.id, req: await req(), data: { withdrawn: true, reason: 'Isolated discovery withdrawal test' } });
      assert.ok(!(await buildPage('/'))?.preloaded[organKey].items.some((item: any) => item.id === 'heart'));
      if (base) {
        const { response, html } = await request('/');
        assert.equal(response.status, 200);
        assert.ok(!html.includes('href="/organs/heart"'));
        assert.match(html, /organ-heart[^>]+aria-disabled="true"/);
      }
      passed('homepage organ entry and diagram follow publication withdrawal');
    } finally {
      await payload.update({ collection: 'publications', id: organPublication.id, req: await req(), data: { withdrawn: organPublication.withdrawn, reason: 'Restore isolated discovery fixture' } });
    }

    process.env.SITE_CONTENT_CHANNEL = 'official';
    assert.equal(await buildPage('/article/glucose'), null);
    assert.equal((pageMetadata(await buildPage('/saved')).robots as any).index, false);
    const sitemap = await sitemapXML();
    assert.ok(!sitemap.includes('/article/glucose'));
    assert.ok(!sitemap.includes('/saved'));
    assert.ok(!sitemap.includes('/admin'));
    passed('official channel does not render or index demo knowledge');
  } finally {
    await payload.update({ collection: 'articles', id: article.id, req: await req(), data: { title: previousTitle, subtitle: previousSubtitle, description: previousDescription } });
    await payload.update({ collection: 'publications', id: publication.id, req: await req(), data: { release: previousRelease, withdrawn: false, reason: 'Restore isolated SSR fixture' } });
  }
  console.log(`${checks} server-rendering groups passed${base ? ' including actual HTTP responses' : ''}.`);
} finally { await payload.destroy(); }
process.exit(0);
