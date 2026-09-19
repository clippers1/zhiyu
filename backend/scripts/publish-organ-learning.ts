import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createLocalReq, getPayload } from 'payload';
import config from '../src/payload.config';
import { relationID, snapshotArticle } from '../src/domain';

const organSpecs = {
  heart: {
    applicability: '面向一般成年读者的基础心脏结构与血液循环科普；为简化示意，不用于个体判断。',
    limitations: '不覆盖疾病、检查数值、特殊人群、诊断或治疗；图形不代表真实大小、位置、速度或心率。',
    sourceCheckNotes: '核对 NHLBI 的四心腔和血流顺序；中文为重新组织，SVG 为原创简化示意；不覆盖瓣膜细节、疾病、数值或诊疗。',
    releaseReason: '上线心脏与血液循环互动样板',
  },
  lung: {
    applicability: '面向一般成年读者的基础呼吸结构与肺泡气体交换科普；为简化示意，不用于个体判断。',
    limitations: '不覆盖疾病、肺功能或血氧数值、特殊人群、诊断或治疗；图形不代表真实数量、大小、位置或呼吸速度。',
    sourceCheckNotes: '核对 NHLBI 的吸气、气道、肺泡气体交换与呼气说明；中文为重新组织，SVG 为原创简化示意；不覆盖疾病、检查数值或诊疗。',
    releaseReason: '上线呼吸与肺泡气体交换互动样板',
  },
} as const;

const slug = process.argv[2] as keyof typeof organSpecs;
const spec = organSpecs[slug];
if (!spec) throw new Error(`Choose a supported organ: ${Object.keys(organSpecs).join(', ')}`);

const payload = await getPayload({ config });
try {
  const admins = await payload.find({ collection: 'users', where: { roles: { contains: 'admin' } }, limit: 1, depth: 0 });
  const admin: any = admins.docs[0];
  if (!admin) throw new Error('An existing administrator is required. This script never creates or elevates an account.');
  const req = await createLocalReq({ user: { ...admin, collection: 'users' } }, payload);
  const bundledContent = path.resolve('public/content');
  const contentDir = process.env.SEED_CONTENT_DIR || (existsSync(bundledContent) ? bundledContent : path.resolve('../public/content'));
  const body = JSON.parse(await readFile(path.join(contentDir, 'organ', `${slug}.json`), 'utf8'));
  const articles = await payload.find({ collection: 'articles', where: { key: { equals: `organ:${slug}` } }, limit: 1, req, depth: 0 });
  const article: any = articles.docs[0];
  if (!article) throw new Error(`Run the initial content seed before publishing the ${slug} learning module.`);

  const sourceSpecs = body.references.map((source: any) => ({ ...source,
    licenseStatus: 'citation-only', availability: 'available',
    licenseNotes: '仅作为事实依据和外链；中文文字与 SVG 均由本项目重新组织和绘制，不复制来源图片、视频或长段原文。',
  }));
  const citations = [];
  for (const sourceSpec of sourceSpecs) {
    const found = await payload.find({ collection: 'sources', where: { url: { equals: sourceSpec.url } }, limit: 1, req, depth: 0 });
    const source: any = found.docs[0]
      ? await payload.update({ collection: 'sources', id: found.docs[0].id, req, data: {
          title: sourceSpec.title, publisher: sourceSpec.publisher, sourceType: sourceSpec.type, language: sourceSpec.language,
          checkedAt: sourceSpec.accessedAt, availability: sourceSpec.availability, licenseStatus: sourceSpec.licenseStatus,
          licenseNotes: sourceSpec.licenseNotes, region: '基础解剖与生理说明；不用于推导个人诊断或治疗建议。',
        } })
      : await payload.create({ collection: 'sources', req, data: {
          title: sourceSpec.title, publisher: sourceSpec.publisher, url: sourceSpec.url, sourceType: sourceSpec.type,
          language: sourceSpec.language, checkedAt: sourceSpec.accessedAt, availability: sourceSpec.availability,
          licenseStatus: sourceSpec.licenseStatus, licenseNotes: sourceSpec.licenseNotes,
          region: '基础解剖与生理说明；不用于推导个人诊断或治疗建议。',
        } });
    citations.push({ key: sourceSpec.id, source: source.id, scope: sourceSpec.scope, locator: sourceSpec.locator });
  }

  await payload.update({ collection: 'articles', id: article.id, req, data: {
    title: body.name, subtitle: body.headline, english: body.en, description: body.text,
    descriptionSourceKeys: body.references.map((source: any) => source.id).join(','),
    applicability: spec.applicability, limitations: spec.limitations,
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
      ? { article: article.id, channel, publicationBasis: 'source-curated', sourceCheckNotes: spec.sourceCheckNotes }
      : { article: article.id, channel } });
  }
  for (const channel of ['demo', 'official'] as const) {
    const release: any = await ensureRelease(channel);
    const key = `${channel}:organ:${slug}`;
    const found = await payload.find({ collection: 'publications', where: { key: { equals: key } }, limit: 1, req, depth: 0 });
    if (found.docs[0]) {
      if (relationID(found.docs[0].release) !== release.id) await payload.update({ collection: 'publications', id: found.docs[0].id, req, data: { release: release.id, withdrawn: false, reason: `${spec.releaseReason}；保留上一修订用于回退。` } });
    } else await payload.create({ collection: 'publications', req, data: { release: release.id, reason: `${spec.releaseReason}。` } });
  }
  console.log(`${slug} learning published to demo and official collections with content hash ${snapshot.hash}. No independent professional review is required or recorded.`);
} finally {
  await payload.destroy();
}
process.exit(0);
