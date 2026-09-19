import { createHash } from 'node:crypto';
import { APIError, type PayloadRequest } from 'payload';

export const relationID = (value: any): number => Number(typeof value === 'object' ? value?.id : value);
export const hasRole = (user: any, ...roles: string[]) => Boolean(user?.roles?.some((r: string) => roles.includes(r)));
export const fail = (message: string, status = 400): never => { throw new APIError(message, status); };
export const splitKeys = (value: string = '') => value.split(/[,，\s]+/).filter(Boolean);
const isoDate = (value: string) => value?.slice(0, 10) || null;

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
export const fingerprint = (value: any) => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

export async function snapshotArticle(req: PayloadRequest, articleID: number) {
  const article: any = await req.payload.findByID({ collection: 'articles', id: articleID, depth: 2, req, overrideAccess: true });
  const references = (article.citations || []).map((citation: any) => {
    const source = citation.source;
    if (!source || typeof source !== 'object') fail('参考来源不存在，请重新选择。');
    return {
      id: citation.key, publisher: source.publisher, title: source.title, url: source.url,
      scope: citation.scope, locator: citation.locator || '', language: source.language,
      type: source.sourceType, accessedAt: isoDate(source.checkedAt), publicationDate: isoDate(source.publicationDate),
      licenseStatus: source.licenseStatus, licenseNotes: source.licenseNotes || '',
      sourceVersion: source.edition || '', sourceRecordID: source.id,
    };
  });
  const common = {
    id: article.slug, kind: article.kind, category: article.category,
    version: 1, updatedAt: isoDate(article.updatedAt), reviewStatus: 'pending', references,
    applicability: article.applicability, limitations: article.limitations || '',
  };
  const body = article.kind === 'indicator' ? {
    ...common, title: article.title, english: article.english || '', subtitle: article.subtitle,
    icon: article.icon, color: article.color, number: article.number || '',
    tags: (article.tags || []).map((t: any) => t.text),
    desc: article.description, descriptionSourceIds: splitKeys(article.descriptionSourceKeys),
    metrics: (article.metrics || []).map((m: any) => ({ name: m.name, text: m.text, sourceIds: splitKeys(m.sourceKeys) })),
    chain: (article.chain || []).map((s: any) => s.text), chainSourceIds: splitKeys(article.chainSourceKeys),
    tip: article.tip, tipSourceIds: splitKeys(article.tipSourceKeys),
    organ: article.organLabel || '',
    relatedOrgans: (article.relatedOrgans || []).map((r: any) => ({ id: r.slug, title: r.title })),
  } : {
    ...common, name: article.title, en: article.english || '', headline: article.subtitle,
    text: article.description, connection: article.organLabel || '',
    related: (article.relatedIndicators || []).map((r: any) => r.slug),
    relatedItems: (article.relatedIndicators || []).map((r: any) => ({ id: r.slug, title: r.title })),
  };
  const summary = {
    id: article.slug, kind: article.kind, title: article.title, subtitle: article.subtitle,
    english: article.english || '', icon: article.icon, color: article.color,
    number: article.number || '', tags: (article.tags || []).map((t: any) => t.text),
    category: article.category, featured: Boolean(article.featured),
    referenceCount: references.length, sourceLabel: references[0]?.publisher || '',
    searchText: [article.title, article.subtitle, article.aliases || '', article.description,
      ...(article.metrics || []).map((m: any) => `${m.name} ${m.text}`)].join(' '),
  };
  // Last-modified time is operational metadata, not part of medical approval.
  const { updatedAt, ...medicalBody } = body;
  const hash = fingerprint({ body: medicalBody, summary, scopeConfirmed: article.scopeConfirmed });
  return { article, body, summary, hash };
}

export function validateForReview(snapshot: Awaited<ReturnType<typeof snapshotArticle>>) {
  const { article, body } = snapshot;
  if (!article.scopeConfirmed || !article.applicability?.trim()) fail('请先明确并确认内容适用范围。');
  if (!body.references.length) fail('内容必须有具体参考来源。');
  for (const ref of body.references) {
    if (!ref.locator?.trim()) fail(`来源 ${ref.id} 缺少页码、段落或锚点定位。`);
    if (ref.licenseStatus === 'unverified' || !ref.licenseNotes?.trim()) fail(`来源 ${ref.id} 尚未完成引用/使用权限核对。`);
  }
  const groups = [splitKeys(article.descriptionSourceKeys)];
  if (article.kind === 'indicator') groups.push(
    ...(article.metrics || []).map((m: any) => splitKeys(m.sourceKeys)),
    splitKeys(article.tipSourceKeys), splitKeys(article.chainSourceKeys),
  );
  if (groups.some(ids => ids.length === 0)) fail('关键知识点必须填写对应来源编号。');
}

export async function audit(req: PayloadRequest, action: string, target: string, detail: string) {
  const originalContext = req.context;
  try {
    req.context = { ...originalContext, internalAudit: true };
    await req.payload.create({
      collection: 'audit-events', overrideAccess: true, req,
      data: { action, target, detail, actor: req.user?.id || null },
    });
  } finally { req.context = originalContext; }
}
