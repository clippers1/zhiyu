import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getPayload, createLocalReq } from 'payload';
import config from '../src/payload.config';

const payload = await getPayload({ config });
try {
  const email = process.env.BOOTSTRAP_EMAIL;
  const password = process.env.BOOTSTRAP_PASSWORD;
  if (!email || !password || password.length < 16) throw new Error('Set BOOTSTRAP_EMAIL and a unique BOOTSTRAP_PASSWORD of at least 16 characters.');
  const existing = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1 });
  const admin: any = existing.docs[0] || await payload.create({ collection: 'users', context: { bootstrap: true }, data: {
    email, password, name: '知愈管理员', roles: ['admin'], qualificationVerified: false,
  } });
  if (!admin.roles.includes('admin')) throw new Error('Bootstrap account must be an administrator.');
  const req = await createLocalReq({ user: { ...admin, collection: 'users' } }, payload);
  const contentDir = process.env.SEED_CONTENT_DIR || path.resolve('../public/content');
  const catalog = JSON.parse(await readFile(path.join(contentDir, 'index.json'), 'utf8'));
  for (const category of catalog.categories) {
    const found = await payload.find({ collection: 'categories', where: { slug: { equals: category.id } }, limit: 1, req });
    if (!found.docs.length) await payload.create({ collection: 'categories', req, data: { slug: category.id, name: category.name } });
  }
  const records = new Map<string, any>();
  const bodies = new Map<string, any>();
  for (const summary of catalog.items) {
    const body = JSON.parse(await readFile(path.join(contentDir, summary.kind, `${summary.id}.json`), 'utf8'));
    bodies.set(summary.id, body);
    const found = await payload.find({ collection: 'articles', where: { key: { equals: `${summary.kind}:${summary.id}` } }, limit: 1, depth: 0, req });
    if (found.docs.length) { records.set(summary.id, { ...found.docs[0], alreadyExists: true }); continue; }
    const citations = [];
    for (const source of body.references) {
      const existingSource = await payload.find({ collection: 'sources', where: { url: { equals: source.url } }, limit: 1, req });
      const stored: any = existingSource.docs[0] || await payload.create({ collection: 'sources', req, data: {
        title: source.title, publisher: source.publisher, url: source.url, sourceType: source.type,
        language: source.language, checkedAt: source.accessedAt, publicationDate: source.publicationDate,
        licenseStatus: 'unverified', licenseNotes: '', region: '原始机构适用地区；待编辑核对',
      } });
      citations.push({ key: source.id, source: stored.id, scope: source.scope, locator: source.locator || '' });
    }
    const article: any = await payload.create({ collection: 'articles', req, data: {
      slug: summary.id, kind: summary.kind, title: summary.title, subtitle: summary.subtitle,
      english: summary.english, category: summary.category, aliases: summary.searchText,
      tags: summary.tags.map((t: string) => ({ text: t })),
      applicability: '面向一般读者的基础科普；具体年龄、地区与特殊人群适用范围尚待来源与表达核对。',
      limitations: '不用于个人诊断或治疗决策。', scopeConfirmed: false,
      contentRisk: body.contentRisk || 'clinical', learning: body.learning || null,
      description: body.desc || body.text,
      descriptionSourceKeys: (body.descriptionSourceIds || body.references.map((r: any) => r.id)).join(','),
      metrics: (body.metrics || []).map((m: any) => ({ name: m.name, text: m.text, sourceKeys: m.sourceIds.join(',') })),
      chain: (body.chain || []).map((text: string) => ({ text })), chainSourceKeys: '',
      tip: body.tip || '', tipSourceKeys: (body.tipSourceIds || []).join(','),
      organLabel: body.organ || body.connection || '', citations,
      featured: summary.featured, icon: summary.icon, color: summary.color, number: summary.number,
    } });
    records.set(summary.id, article);
  }
  for (const [slug, article] of records) {
    if (!article.alreadyExists) {
      const body = bodies.get(slug);
      const organMap: Record<string, string[]> = { glucose: ['pancreas', 'liver'], pressure: ['heart'], lipids: ['liver'] };
      await payload.update({ collection: 'articles', id: article.id, req, data: {
        relatedIndicators: (body.related || []).map((id: string) => records.get(id).id),
        relatedOrgans: (organMap[slug] || []).map(id => records.get(id).id),
      } });
    }
    if (process.env.SEED_DEMO !== 'true') continue;
    const existingPublication = await payload.find({ collection: 'publications', where: { key: { equals: `demo:${article.kind}:${slug}` } }, limit: 1, req });
    // Reruns never overwrite editorial work, switch releases, or undo a withdrawal.
    if (existingPublication.docs.length) continue;
    const release: any = await payload.create({ collection: 'releases', req, data: { article: article.id, channel: 'demo' } });
    await payload.create({ collection: 'publications', req, data: { release: release.id, reason: '迁移既有 Beta 演示内容；尚未完成来源、适用范围与表达核对，不能用于正式发布。' } });
  }
  console.log(`Imported ${records.size} content records. Source checks created: 0. Formal publications created: 0.`);
} finally { await payload.destroy(); }
process.exit(0);
