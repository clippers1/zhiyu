import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createLocalReq, getPayload } from 'payload';
import config from '../src/payload.config';
import { relationID, snapshotArticle } from '../src/domain';

const payload = await getPayload({ config });
try {
  const admins = await payload.find({ collection: 'users', where: { roles: { contains: 'admin' } }, limit: 1, depth: 0 });
  const admin: any = admins.docs[0];
  if (!admin) throw new Error('An existing administrator is required. This script never creates or elevates an account.');
  const req = await createLocalReq({ user: { ...admin, collection: 'users' } }, payload);
  const body = JSON.parse(await readFile(path.resolve('public/content/organ/heart.json'), 'utf8'));
  const articles = await payload.find({ collection: 'articles', where: { key: { equals: 'organ:heart' } }, limit: 1, req, depth: 0 });
  const article: any = articles.docs[0];
  if (!article) throw new Error('Run the initial content seed before publishing the heart learning module.');

  const sourceSpecs = body.references.map((source: any) => ({ ...source,
    licenseStatus: 'citation-only', availability: 'available',
    licenseNotes: '仅作为事实依据和外链；中文文字与 SVG 均由本项目重新组织和绘制，不复制来源图片、视频或长段原文。',
  }));
  const citations = [];
  for (const spec of sourceSpecs) {
    const found = await payload.find({ collection: 'sources', where: { url: { equals: spec.url } }, limit: 1, req, depth: 0 });
    const source: any = found.docs[0]
      ? await payload.update({ collection: 'sources', id: found.docs[0].id, req, data: {
          title: spec.title, publisher: spec.publisher, sourceType: spec.type, language: spec.language,
          checkedAt: spec.accessedAt, availability: spec.availability, licenseStatus: spec.licenseStatus,
          licenseNotes: spec.licenseNotes, region: '基础解剖与生理说明；不用于推导个人诊断或治疗建议。',
        } })
      : await payload.create({ collection: 'sources', req, data: {
          title: spec.title, publisher: spec.publisher, url: spec.url, sourceType: spec.type,
          language: spec.language, checkedAt: spec.accessedAt, availability: spec.availability,
          licenseStatus: spec.licenseStatus, licenseNotes: spec.licenseNotes,
          region: '基础解剖与生理说明；不用于推导个人诊断或治疗建议。',
        } });
    citations.push({ key: spec.id, source: source.id, scope: spec.scope, locator: spec.locator });
  }

  await payload.update({ collection: 'articles', id: article.id, req, data: {
    title: body.name, subtitle: body.headline, english: body.en, description: body.text,
    descriptionSourceKeys: body.references.map((source: any) => source.id).join(','),
    applicability: '面向一般成年读者的基础心脏结构与血液循环科普；为简化示意，不用于个体判断。',
    limitations: '不覆盖疾病、检查数值、特殊人群、诊断或治疗；图形不代表真实大小、位置、速度或心率。',
    scopeConfirmed: true, contentRisk: 'foundational', learning: body.learning,
    organLabel: body.connection, citations,
  } });
  const snapshot = await snapshotArticle(req, article.id);

  async function ensureRelease(channel: 'demo' | 'official') {
    const where: any = { and: [
      { article: { equals: article.id } }, { channel: { equals: channel } }, { contentHash: { equals: snapshot.hash } },
      ...(channel === 'official' ? [{ publicationBasis: { equals: 'source-curated' } }] : []),
    ] };
    const existing = await payload.find({ collection: 'releases', where, limit: 1, sort: '-id', req, depth: 0 });
    return existing.docs[0] || payload.create({ collection: 'releases', req, data: channel === 'official'
      ? { article: article.id, channel, publicationBasis: 'source-curated', sourceCheckNotes: '核对 NHLBI 的四心腔和血流顺序；中文为重新组织，SVG 为原创简化示意；不覆盖瓣膜细节、疾病、数值或诊疗。' }
      : { article: article.id, channel } });
  }
  for (const channel of ['demo', 'official'] as const) {
    const release: any = await ensureRelease(channel);
    const key = `${channel}:organ:heart`;
    const found = await payload.find({ collection: 'publications', where: { key: { equals: key } }, limit: 1, req, depth: 0 });
    if (found.docs[0]) {
      if (relationID(found.docs[0].release) !== release.id) await payload.update({ collection: 'publications', id: found.docs[0].id, req, data: { release: release.id, withdrawn: false, reason: '上线心脏与血液循环互动样板；保留上一修订用于回退。' } });
    } else await payload.create({ collection: 'publications', req, data: { release: release.id, reason: '上线心脏与血液循环互动样板。' } });
  }
  console.log(`Heart learning published to demo and official collections with content hash ${snapshot.hash}. No medical review record was created.`);
} finally {
  await payload.destroy();
}
process.exit(0);
