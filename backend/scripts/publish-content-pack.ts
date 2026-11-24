import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createLocalReq, getPayload } from 'payload';
import config from '../src/payload.config';
import { relationID, snapshotArticle } from '../src/domain';

const args = process.argv.slice(2);
const confirmSourceCheck = args.includes('--confirm-source-check');
const publishAll = args.includes('--all');
const requested = args.filter(arg => !arg.startsWith('--'));
if (!confirmSourceCheck) throw new Error('Publishing requires --confirm-source-check after a person has opened the cited sections and checked the Chinese summary.');
if (!publishAll && !requested.length) throw new Error('Choose content ids or use --all to publish every knowledge pack marked publicationReady.');

const bundledContent = path.resolve('public/content');
const contentDir = process.env.SEED_CONTENT_DIR || (existsSync(bundledContent) ? bundledContent : path.resolve('../public/content'));

type Pack = { kind: 'indicator' | 'organ' | 'story'; body: any };

async function loadPacks(): Promise<Pack[]> {
  const packs: Pack[] = [];
  for (const kind of ['indicator', 'organ', 'story'] as const) {
    for (const file of await readdir(path.join(contentDir, kind))) {
      if (!file.endsWith('.json')) continue;
      const body = JSON.parse(await readFile(path.join(contentDir, kind, file), 'utf8'));
      if (body.kind !== kind || file !== `${body.id}.json`) throw new Error(`${kind}/${file} has inconsistent kind or id.`);
      if ((publishAll && body.publicationReady) || requested.includes(body.id)) packs.push({ kind, body });
    }
  }
  const missing = requested.filter(id => !packs.some(pack => pack.body.id === id));
  if (missing.length) throw new Error(`Unknown content ids: ${missing.join(', ')}`);
  if (!packs.length) throw new Error('No publication-ready content packs were selected.');
  return packs.sort((a, b) => a.body.catalogOrder - b.body.catalogOrder);
}

function keys(value: any) {
  return Array.isArray(value) ? value.join(',') : '';
}

function validatePack({ kind, body }: Pack) {
  if (!body.publicationReady) throw new Error(`${body.id}: publicationReady must be true.`);
  if (body.contentRisk !== 'foundational') throw new Error(`${body.id}: batch source publication only accepts foundational content.`);
  for (const field of ['id', 'category', 'applicability', 'limitations']) {
    if (!String(body[field] || '').trim()) throw new Error(`${body.id}: ${field} is required.`);
  }
  if (!Array.isArray(body.references) || !body.references.length) throw new Error(`${body.id}: at least one reference is required.`);
  const sourceIDs = new Set(body.references.map((source: any) => source.id));
  for (const source of body.references) {
    for (const field of ['id', 'publisher', 'title', 'url', 'scope', 'locator', 'accessedAt', 'language', 'type']) {
      if (!String(source[field] || '').trim()) throw new Error(`${body.id}/${source.id}: ${field} is required.`);
    }
    if (new URL(source.url).protocol !== 'https:') throw new Error(`${body.id}/${source.id}: source URL must use HTTPS.`);
  }
  const groups = [body.descriptionSourceIds, ...(body.metrics || []).map((item: any) => item.sourceIds)];
  if (kind === 'indicator') groups.push(body.chainSourceIds, body.tipSourceIds);
  if (kind === 'story') groups.push(body.tipSourceIds);
  if (kind === 'organ' && Array.isArray(body.sections)) {
    for (const section of body.sections) {
      groups.push(...(section.paragraphs || []).map((paragraph: any) => paragraph.sourceIds));
    }
  }
  const longForm = kind === 'story' || body.format === 'article';
  if (longForm) {
    // Same minimums as scripts/content.test.mjs: a page that only restates its
    // own summary is not publishable as a long-form article.
    if (!Array.isArray(body.sections) || body.sections.length < 4) throw new Error(`${body.id}: long-form content needs at least 4 sections.`);
    if (!Array.isArray(body.faq) || body.faq.length < 4) throw new Error(`${body.id}: long-form content needs at least 4 FAQ entries.`);
    if (!Array.isArray(body.figures) || !body.figures.length) throw new Error(`${body.id}: long-form content needs at least one figure.`);
    const chinese = (value: string) => (String(value || '').match(/[\u4e00-\u9fff]/g) || []).length;
    const bodyText = body.sections.flatMap((section: any) => section.paragraphs || []).reduce((sum: number, paragraph: any) => sum + chinese(paragraph.text), 0);
    if (bodyText < 900) throw new Error(`${body.id}: long-form body has ${bodyText} Chinese characters; at least 900 required.`);
    for (const section of body.sections) {
      if (!Array.isArray(section.paragraphs) || section.paragraphs.length < 2) throw new Error(`${body.id}: each section needs at least two paragraphs.`);
      groups.push(...section.paragraphs.map((paragraph: any) => paragraph.sourceIds));
    }
    for (const item of body.faq) groups.push(item.sourceIds);
  }
  for (const group of groups) {
    if (!Array.isArray(group) || !group.length || group.some(id => !sourceIDs.has(id))) throw new Error(`${body.id}: every key section must cite an existing source.`);
  }
}

async function checkSources(packs: Pack[]) {
  const urls = [...new Set(packs.flatMap(pack => pack.body.references.map((source: any) => source.url)))] as string[];
  for (const url of urls) {
    let lastError: unknown;
    let checked = false;
    for (let attempt = 1; attempt <= 3 && !checked; attempt++) {
      try {
        const response = await fetch(url, {
          redirect: 'follow',
          signal: AbortSignal.timeout(30_000),
          headers: { 'user-agent': 'Mozilla/5.0 (compatible; ZhiyuSourceCheck/0.1)' },
        });
        await response.body?.cancel();
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        checked = true;
      } catch (error) {
        lastError = error;
        if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 500));
      }
    }
    if (!checked) throw new Error(`Source is not reachable after 3 attempts: ${url}`, { cause: lastError });
  }
  console.log(`Checked ${urls.length} source URLs.`);
}

const packs = await loadPacks();
packs.forEach(validatePack);
await checkSources(packs);

const payload = await getPayload({ config });
try {
  const admins = await payload.find({ collection: 'users', where: { roles: { contains: 'admin' } }, limit: 1, depth: 0 });
  const admin: any = admins.docs[0];
  if (!admin) throw new Error('An existing administrator is required. This script never creates or elevates an account.');
  const req = await createLocalReq({ user: { ...admin, collection: 'users' } }, payload);
  const categories = JSON.parse(await readFile(path.join(contentDir, 'categories.json'), 'utf8'));
  for (const category of categories) {
    const found = await payload.find({ collection: 'categories', where: { slug: { equals: category.id } }, limit: 1, req, depth: 0 });
    if (!found.docs.length) await payload.create({ collection: 'categories', req, data: { slug: category.id, name: category.name } });
  }

  const prepared = new Map<string, { pack: Pack; article: any; data: any }>();
  for (const pack of packs) {
    const { kind, body } = pack;
    const citations = [];
    for (const sourceSpec of body.references) {
      const found = await payload.find({ collection: 'sources', where: { url: { equals: sourceSpec.url } }, limit: 1, req, depth: 0 });
      const sourceData: any = {
        title: sourceSpec.title,
        publisher: sourceSpec.publisher,
        url: sourceSpec.url,
        sourceType: sourceSpec.type,
        language: sourceSpec.language,
        checkedAt: sourceSpec.accessedAt,
        publicationDate: sourceSpec.publicationDate || null,
        availability: 'available',
        licenseStatus: 'citation-only',
        licenseNotes: '仅作为事实依据和外链；中文文字由本项目重新组织，不复制来源图片、视频或长段原文。',
        region: '一般基础术语说明；不用于推导个人诊断、数值目标或治疗建议。',
      };
      const source: any = found.docs[0]
        ? await payload.update({ collection: 'sources', id: found.docs[0].id, req, data: sourceData })
        : await payload.create({ collection: 'sources', req, data: sourceData });
      citations.push({ key: sourceSpec.id, source: source.id, scope: sourceSpec.scope, locator: sourceSpec.locator });
    }
    const data: any = {
      slug: body.id,
      kind,
      title: body.title || body.name,
      subtitle: body.subtitle || body.headline,
      english: body.english || body.en || '',
      question: kind === 'organ' ? '' : (body.question || ''),
      questionAnswer: kind === 'organ' ? '' : (body.questionAnswer || ''),
      category: body.category,
      aliases: [...(body.searchAliases || []), ...(body.tags || [])].join(' '),
      tags: (body.tags || []).map((text: string) => ({ text })),
      applicability: body.applicability,
      limitations: body.limitations,
      scopeConfirmed: true,
      contentRisk: body.contentRisk,
      format: kind === 'story' ? 'article' : (body.format || 'entry'),
      learning: body.learning || null,
      figure: body.figure || null,
      sections: (body.sections || []).map((section: any) => ({
        title: section.title,
        short: section.short || '',
        figure: section.figure || '',
        paragraphs: (section.paragraphs || []).map((paragraph: any) => ({ text: paragraph.text, sourceKeys: keys(paragraph.sourceIds) })),
      })),
      faq: (body.faq || []).map((item: any) => ({ question: item.question, answer: item.answer, sourceKeys: keys(item.sourceIds) })),
      figures: body.figures || null,
      description: body.desc || body.text,
      descriptionSourceKeys: keys(body.descriptionSourceIds || body.references.map((source: any) => source.id)),
      metrics: (body.metrics || []).map((item: any) => ({ name: item.name, text: item.text, sourceKeys: keys(item.sourceIds) })),
      chain: (body.chain || []).map((text: string) => ({ text })),
      chainSourceKeys: keys(body.chainSourceIds),
      tip: body.tip || '',
      tipSourceKeys: keys(body.tipSourceIds),
      organLabel: body.organ || body.connection || '',
      featured: Boolean(body.featured),
      icon: body.icon || 'heart',
      color: body.color || 'green',
      number: body.number || '',
      citations,
    };
    const found = await payload.find({ collection: 'articles', where: { key: { equals: `${kind}:${body.id}` } }, limit: 1, req, depth: 0 });
    const article: any = found.docs[0]
      ? await payload.update({ collection: 'articles', id: found.docs[0].id, req, data })
      : await payload.create({ collection: 'articles', req, data });
    prepared.set(body.id, { pack, article, data });
  }

  async function relation(id: string, kind: 'indicator' | 'organ') {
    const selected = prepared.get(id)?.article;
    if (selected) return selected.id;
    const found = await payload.find({ collection: 'articles', where: { key: { equals: `${kind}:${id}` } }, limit: 1, req, depth: 0 });
    if (!found.docs[0]) throw new Error(`Related content is missing: ${kind}:${id}`);
    return found.docs[0].id;
  }

  for (const { pack, article, data } of prepared.values()) {
    const { kind, body } = pack;
    const relatedOrgans = [];
    for (const item of body.relatedOrgans || []) relatedOrgans.push(await relation(item.id || item, 'organ'));
    const relatedIndicators = [];
    for (const id of body.related || []) relatedIndicators.push(await relation(id, 'indicator'));
    const updated: any = await payload.update({ collection: 'articles', id: article.id, req, data: { ...data, relatedOrgans, relatedIndicators } });
    const snapshot = await snapshotArticle(req, updated.id);
    for (const channel of ['demo', 'official'] as const) {
      const releaseQuery: any = { and: [
        { article: { equals: updated.id } }, { channel: { equals: channel } }, { contentHash: { equals: snapshot.hash } },
        ...(channel === 'official' ? [{ publicationBasis: { equals: 'source-curated' } }] : []),
      ] };
      const releases = await payload.find({ collection: 'releases', where: releaseQuery, limit: 1, sort: '-id', req, depth: 0 });
      const release: any = releases.docs[0] || await payload.create({ collection: 'releases', req, data: channel === 'official' ? {
        article: updated.id,
        channel,
        publicationBasis: 'source-curated',
        sourceCheckNotes: `逐项核对 ${body.references.length} 个机构来源的指定段落、中文表达和引用关系；内容仅解释基础术语与项目分工，不包含数值阈值、疾病判断或治疗建议。`,
      } : { article: updated.id, channel } });
      const key = `${channel}:${kind}:${body.id}`;
      const publications = await payload.find({ collection: 'publications', where: { key: { equals: key } }, limit: 1, req, depth: 0 });
      const reason = `从结构化知识包发布 ${body.title || body.name}；保留上一修订用于回退。`;
      if (publications.docs[0]) {
        if (relationID(publications.docs[0].release) !== release.id || publications.docs[0].withdrawn) {
          await payload.update({ collection: 'publications', id: publications.docs[0].id, req, data: { release: release.id, withdrawn: false, reason } });
        }
      } else await payload.create({ collection: 'publications', req, data: { release: release.id, reason } });
    }
    console.log(`Published ${kind}:${body.id} to demo and official channels (${snapshot.hash.slice(0, 12)}).`);
  }
} finally {
  await payload.destroy();
}
process.exit(0);
