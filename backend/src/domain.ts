import { createHash } from 'node:crypto';
import { APIError, type PayloadRequest } from 'payload';

export const relationID = (value: any): number => Number(typeof value === 'object' ? value?.id : value);
export const hasRole = (user: any, ...roles: string[]) => Boolean(user?.roles?.some((r: string) => roles.includes(r)));
export const fail = (message: string, status = 400): never => { throw new APIError(message, status); };
export const splitKeys = (value: string | null = '') => (value || '').split(/[,，\s]+/).filter(Boolean);
const isoDate = (value: string) => value?.slice(0, 10) || null;

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
export const fingerprint = (value: any) => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

function visualLearning(value: any, sourceKeys: Set<string>) {
  if (value == null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('互动学习内容格式不正确。');
  if (value.type !== 'heart-flow-v1') fail('暂不支持这种互动学习类型。');
  const text = (input: any, label: string, max = 600) => {
    if (typeof input !== 'string' || !input.trim() || input.length > max) fail(`互动学习的${label}不完整。`);
    return input.trim();
  };
  const keys = (input: any, label: string) => {
    if (!Array.isArray(input) || !input.length || input.some(key => typeof key !== 'string' || !sourceKeys.has(key))) fail(`互动学习的${label}引用了不存在的来源。`);
    return [...new Set(input)];
  };
  if (!Array.isArray(value.parts) || value.parts.length < 4 || value.parts.length > 12) fail('互动学习应包含 4–12 个结构。');
  const parts = value.parts.map((part: any) => ({
    id: text(part?.id, '结构标识', 40), label: text(part?.label, '结构名称', 40),
    summary: text(part?.summary, '结构解释'), sourceIds: keys(part?.sourceIds, '结构解释'),
  }));
  const partIds = new Set(parts.map((part: any) => part.id));
  if (partIds.size !== parts.length || parts.some((part: any) => !/^[a-z0-9-]+$/.test(part.id))) fail('互动学习的结构标识必须唯一，且只能使用英文小写、数字和连字符。');
  if (!Array.isArray(value.steps) || value.steps.length < 2 || value.steps.length > 12) fail('互动学习应包含 2–12 个步骤。');
  const steps = value.steps.map((step: any) => ({
    id: text(step?.id, '步骤标识', 40), title: text(step?.title, '步骤标题', 80),
    text: text(step?.text, '步骤解释'), from: text(step?.from, '起点', 40), to: text(step?.to, '终点', 40),
    sourceIds: keys(step?.sourceIds, '步骤解释'),
  }));
  if (new Set(steps.map((step: any) => step.id)).size !== steps.length || steps.some((step: any) => !/^[a-z0-9-]+$/.test(step.id) || !partIds.has(step.from) || !partIds.has(step.to))) fail('互动学习的步骤标识或结构关系不正确。');
  const questions = Array.isArray(value.questions) ? value.questions.map((question: any) => {
    if (!Array.isArray(question?.options) || question.options.length < 2 || question.options.length > 5) fail('理解题应包含 2–5 个选项。');
    if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex >= question.options.length) fail('理解题正确选项不正确。');
    return { question: text(question.question, '题目'), options: question.options.map((option: any) => text(option, '选项', 120)),
      correctIndex: question.correctIndex, explanation: text(question.explanation, '答案解释'), sourceIds: keys(question.sourceIds, '答案解释') };
  }) : [];
  if (questions.length > 3) fail('首期互动学习最多包含 3 道理解题。');
  return { type: value.type, title: text(value.title, '标题', 100), intro: text(value.intro, '介绍'),
    simplification: text(value.simplification, '简化说明'), parts, steps, questions };
}

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
      availability: source.availability || 'unchecked',
      sourceVersion: source.edition || '', sourceRecordID: source.id,
    };
  });
  const common = {
    id: article.slug, kind: article.kind, category: article.category,
    version: 1, updatedAt: isoDate(article.updatedAt), reviewStatus: 'pending', references,
    applicability: article.applicability, limitations: article.limitations || '',
    contentRisk: article.contentRisk || 'clinical',
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
    learning: visualLearning(article.learning, new Set(references.map((reference: any) => reference.id))),
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
  const hash = fingerprint({ body: medicalBody, summary, scopeConfirmed: article.scopeConfirmed, contentRisk: article.contentRisk || 'clinical' });
  return { article, body, summary, hash };
}

export function validateForReview(snapshot: Awaited<ReturnType<typeof snapshotArticle>>) {
  const { article, body } = snapshot;
  if (!article.scopeConfirmed || !article.applicability?.trim()) fail('请先明确并确认内容适用范围。');
  if (!body.references.length) fail('内容必须有具体参考来源。');
  for (const ref of body.references) {
    if (ref.availability !== 'available') fail(`来源 ${ref.id} 尚未确认可用，请先完成人工检查。`);
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

export function validateForSourcePublication(snapshot: Awaited<ReturnType<typeof snapshotArticle>>) {
  validateForReview(snapshot);
  if (snapshot.article.contentRisk !== 'foundational') fail('来源整理发布仅适用于已明确标记的基础解剖、生理或术语内容。');
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
