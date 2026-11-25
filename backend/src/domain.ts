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
  if (!['heart-flow-v1', 'lung-gas-exchange-v1', 'kidney-filtration-v1', 'thyroid-feedback-v1'].includes(value.type)) fail('暂不支持这种互动学习类型。');
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
  return { type: value.type, title: text(value.title, '标题', 100), intro: text(value.intro, '介绍'),
    simplification: text(value.simplification, '简化说明'), parts, steps };
}

// Indicators may carry one verified static diagram. It must reference an
// existing attribution record registered in docs/media-attribution.md, cite
// only sources already present in this article, and explain its simplification.
// Unverified media never reaches the published snapshot: absent field means no
// figure, so pages keep a text-only reading path.
function figureBlock(value: any, sourceKeys: Set<string>, fallbackKey = 'legacy') {
  if (value == null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('图解内容格式不正确。');
  const text = (input: any, label: string, max: number) => {
    if (typeof input !== 'string' || !input.trim() || input.length > max) fail(`图解的${label}不完整。`);
    return input.trim();
  };
  const diagram = typeof value.diagram === 'string' ? value.diagram : null;
  if (diagram) {
    if (!/^[a-z0-9-]+$/.test(diagram)) fail('自制示意图的标识只能使用英文小写、数字和连字符。');
  } else if (typeof value.src !== 'string' || !/^\/media\/[a-z0-9-]+\.(png|webp)$/.test(value.src)) {
    fail('图解图片路径不正确，仅允许站内 /media/ 下的 PNG/WebP 或已登记的站内示意图标识。');
  }
  const sourceIds = Array.isArray(value.sourceIds) && value.sourceIds.length && value.sourceIds.every((key: any) => typeof key === 'string' && sourceKeys.has(key))
    ? [...new Set(value.sourceIds)] : null;
  if (!sourceIds) fail('图解引用了不存在的来源编号。');
  const attribution = value.attribution;
  if (!attribution || typeof attribution !== 'object' || Array.isArray(attribution)) fail('图解缺少素材权利说明。');
  const kind = attribution.kind === 'self-made' ? 'self-made' : attribution.kind === 'ai-generated' ? 'ai-generated' : 'third-party';
  const attributionOut: any = { kind, name: text(attribution.name, '素材名称', 120) };
  if (kind === 'ai-generated') {
    attributionOut.model = text(attribution.model, '生成模型', 80);
    if (typeof attribution.assetSha256 === 'string' && /^[a-f0-9]{12,64}$/.test(attribution.assetSha256)) {
      attributionOut.assetSha256 = attribution.assetSha256;
    }
  } else if (kind === 'third-party') {
    attributionOut.url = text(attribution.url, '素材来源链接', 300);
    attributionOut.license = text(attribution.license, '授权名称', 60);
    attributionOut.licenseUrl = text(attribution.licenseUrl, '授权链接', 300);
    for (const key of ['url', 'licenseUrl'] as const) {
      if (!/^https:\/\//.test(attributionOut[key])) fail(`图解的${key === 'url' ? '素材来源链接' : '授权链接'}必须使用 HTTPS。`);
    }
  }
  const legend = Array.isArray(value.legend) && value.legend.length
    ? value.legend.slice(0, 6).map((item: any) => ({
      title: text(item?.title, '图例标题', 60),
      text: text(item?.text, '图例说明', 240),
    }))
    : undefined;
  return {
    key: typeof value.key === 'string' && /^[a-z0-9-]+$/.test(value.key) ? value.key : fallbackKey,
    ...(diagram ? { diagram } : {
      src: value.src, width: Number.isInteger(value.width) && value.width > 0 ? value.width : null,
      height: Number.isInteger(value.height) && value.height > 0 ? value.height : null,
    }),
    alt: text(value.alt, '替代文本', 200), caption: text(value.caption, '图注', 300),
    simplification: text(value.simplification, '简化说明', 600), sourceIds, attribution: attributionOut,
    ...(legend ? { legend } : {}),
  };
}

// A long-form page may carry several figures, each keyed so a section can name
// the one it explains. A single malformed figure fails the whole snapshot
// rather than silently dropping from the page.
function figuresBlock(value: any, sourceKeys: Set<string>) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 6) fail('图解列表应为 1–6 项。');
  const figures = value.map((figure: any) => figureBlock(figure, sourceKeys));
  if (new Set(figures.map((figure: any) => figure.key)).size !== figures.length) fail('图解的 key 不可重复。');
  for (const figure of figures) {
    const known = figure.diagram || figure.src;
    if (figures.filter((other: any) => (other.diagram || other.src) === known).length > 1) fail('同一张图不可在正文中重复登记。');
  }
  return figures;
}

// Long-form bodies: sections and FAQ answers each cite existing source keys.
// Depths are bounded so a malformed pack cannot grow a snapshot without limit.
function longForm(value: any, sourceKeys: Set<string>) {
  // Payload returns [] for an unset array field; an empty array means "no
  // long-form body", not "a malformed one".
  const sectionsValue = value?.sections?.length ? value.sections : null;
  const faqValue = value?.faq?.length ? value.faq : null;
  if (sectionsValue == null && faqValue == null) return { sections: undefined, faq: undefined };
  const keys = (input: any, label: string) => {
    if (!Array.isArray(input) || !input.length || input.some(key => typeof key !== 'string' || !sourceKeys.has(key))) fail(`正文的${label}引用了不存在的来源编号。`);
    return [...new Set(input)];
  };
  const max = (input: any, label: string) => {
    if (typeof input !== 'string' || !input.trim() || input.length > 1200) fail(`正文的${label}不完整或过长。`);
    return input.trim();
  };
  const sections = Array.isArray(sectionsValue) ? sectionsValue.map((section: any) => ({
    title: max(section?.title, '小标题'),
    short: section?.short?.trim() || undefined,
    figure: section?.figure?.trim() || undefined,
    paragraphs: (Array.isArray(section?.paragraphs) ? section.paragraphs : []).map((paragraph: any) => ({
      text: max(paragraph?.text, '段落'), sourceIds: keys(paragraph?.sourceKeys ? splitKeys(paragraph.sourceKeys) : paragraph?.sourceIds, '段落'),
    })),
  })) : undefined;
  if (sections && (!sections.length || sections.length > 12)) fail('长文应包含 1–12 个分节。');
  if (sections?.some((section: any) => !section.paragraphs.length)) fail('长文的每个分节至少需要一段正文。');
  const faq = Array.isArray(faqValue) ? faqValue.map((item: any) => ({
    question: max(item?.question, '问题'), answer: max(item?.answer, '回答'),
    sourceIds: keys(item?.sourceKeys ? splitKeys(item.sourceKeys) : item?.sourceIds, '回答'),
  })) : undefined;
  if (faq && faq.length > 20) fail('常见问题最多 20 条。');
  return { sections, faq };
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
  const long = longForm(article, new Set(references.map((reference: any) => reference.id)));
  const figures = figuresBlock(article.figures, new Set(references.map((reference: any) => reference.id)));
  const common = {
    id: article.slug, kind: article.kind, category: article.category,
    version: 1, updatedAt: isoDate(article.updatedAt), reviewStatus: 'pending', references,
    applicability: article.applicability, limitations: article.limitations || '',
    contentRisk: article.contentRisk || 'clinical',
  };
  const articleFields = {
    title: article.title, english: article.english || '', subtitle: article.subtitle,
    question: article.question || '', questionAnswer: article.questionAnswer || '',
    icon: article.icon, color: article.color, number: article.number || '',
    tags: (article.tags || []).map((t: any) => t.text),
    sections: long.sections, faq: long.faq,
    ...(figures.length ? { figures } : {}),
  };
  const body = article.kind === 'indicator' ? {
    ...common, ...articleFields,
    desc: article.description, descriptionSourceIds: splitKeys(article.descriptionSourceKeys),
    metrics: (article.metrics || []).map((m: any) => ({ name: m.name, text: m.text, sourceIds: splitKeys(m.sourceKeys) })),
    chain: (article.chain || []).map((s: any) => s.text), chainSourceIds: splitKeys(article.chainSourceKeys),
    tip: article.tip, tipSourceIds: splitKeys(article.tipSourceKeys),
    organ: article.organLabel || '',
    relatedOrgans: (article.relatedOrgans || []).map((r: any) => ({ id: r.slug, title: r.title })),
    related: (article.relatedIndicators || []).map((r: any) => r.slug),
    figure: figureBlock(article.figure, new Set(references.map((reference: any) => reference.id))),
  } : article.kind === 'story' ? {
    ...common, ...articleFields,
    desc: article.description, descriptionSourceIds: splitKeys(article.descriptionSourceKeys),
    tip: article.tip, tipSourceIds: splitKeys(article.tipSourceKeys),
    organ: article.organLabel || '',
    relatedOrgans: (article.relatedOrgans || []).map((r: any) => ({ id: r.slug, title: r.title })),
  } : {
    ...common, name: article.title, en: article.english || '', headline: article.subtitle,
    text: article.description, connection: article.organLabel || '',
    related: (article.relatedIndicators || []).map((r: any) => r.slug),
    relatedItems: (article.relatedIndicators || []).map((r: any) => ({ id: r.slug, title: r.title })),
    ...(long.sections ? { sections: long.sections } : {}),
    learning: visualLearning(article.learning, new Set(references.map((reference: any) => reference.id))),
  };
  const summary = {
    id: article.slug, kind: article.kind, title: article.title, subtitle: article.subtitle,
    question: article.kind === 'organ' ? '' : (article.question || ''),
    questionAnswer: article.kind === 'organ' ? '' : (article.questionAnswer || ''),
    english: article.english || '', icon: article.icon, color: article.color,
    number: article.number || '', tags: (article.tags || []).map((t: any) => t.text),
    category: article.category, featured: Boolean(article.featured),
    format: article.kind === 'story' ? 'article' : (article.format || 'entry'),
    // The reader home page introduces the lead article with its opening visual.
    // Self-made diagrams and AI-generated editorial illustrations travel in the
    // summary; third-party assets keep their full attribution on the article page.
    ...(() => {
      const lead = figures.find((figure: any) => figure.diagram || (figure.src && figure.attribution?.kind !== 'third-party'));
      if (!lead) return {};
      if (lead.diagram) return { leadFigure: { diagram: lead.diagram, caption: lead.caption } };
      return {
        leadFigure: {
          src: lead.src,
          alt: lead.alt,
          caption: lead.caption,
          ...(lead.width ? { width: lead.width } : {}),
          ...(lead.height ? { height: lead.height } : {}),
          attribution: {
            kind: lead.attribution.kind,
            name: lead.attribution.name,
            ...(lead.attribution.model ? { model: lead.attribution.model } : {}),
          },
        },
      };
    })(),
    referenceCount: references.length, sourceLabel: references[0]?.publisher || '',
    searchText: [article.title, article.subtitle, article.question || '', article.aliases || '', article.description,
      ...(article.metrics || []).map((m: any) => `${m.name} ${m.text}`),
      ...(long.sections || []).flatMap((section: any) => [section.title, ...section.paragraphs.map((paragraph: any) => paragraph.text)]),
      ...(long.faq || []).flatMap((item: any) => [item.question, item.answer])].join(' '),
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
  if (article.kind === 'story') groups.push(splitKeys(article.tipSourceKeys));
  if (article.kind === 'organ' && article.sections?.length) {
    groups.push(...(article.sections || []).flatMap((section: any) => section.paragraphs.map((paragraph: any) => splitKeys(paragraph.sourceKeys))));
  } else if (article.sections?.length || article.faq?.length) {
    if (!article.sections?.length || !article.faq?.length) fail('图文长文需要同时提供分节正文和常见问题。');
    groups.push(...(article.sections || []).flatMap((section: any) => section.paragraphs.map((paragraph: any) => splitKeys(paragraph.sourceKeys))));
    groups.push(...(article.faq || []).map((item: any) => splitKeys(item.sourceKeys)));
    if ((article.figures || []).length === 0) fail('图文长文至少需要一张图解。');
  }
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
