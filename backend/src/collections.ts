import { type CollectionConfig, type Field } from 'payload';
import { audit, fail, hasRole, relationID, snapshotArticle, splitKeys, validateForReview, validateForSourcePublication } from './domain';

const member = ({ req }: any) => Boolean(req.user);
const admin = ({ req }: any) => hasRole(req.user, 'admin');
const edit = ({ req }: any) => hasRole(req.user, 'admin', 'editor');
const publish = ({ req }: any) => hasRole(req.user, 'admin', 'publisher');
const never = () => false;
const text = (name: string, label: string, required = false): Field => ({ name, label, type: 'text', required });
const indicatorOnly = (_: any, sibling: any) => sibling.kind === 'indicator';

export const Users: CollectionConfig = {
  slug: 'users', labels: { singular: '后台成员', plural: '后台成员' },
  auth: { tokenExpiration: 7200, maxLoginAttempts: 5, lockTime: 15 * 60 * 1000, cookies: { sameSite: 'Lax', secure: process.env.COOKIE_SECURE === 'true' } },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'email', 'roles', 'qualificationVerified'] },
  access: {
    create: admin, delete: never, admin: member,
    read: ({ req }) => hasRole(req.user, 'admin') ? true : req.user ? { id: { equals: req.user.id } } : false,
    update: ({ req }) => hasRole(req.user, 'admin') ? true : req.user ? { id: { equals: req.user.id } } : false,
  },
  hooks: { beforeChange: [({ data, req, operation }) => {
    if (operation === 'create' && !req.context?.bootstrap && !hasRole(req.user, 'admin')) fail('仅管理员可创建后台成员。', 403);
    if (data.qualificationVerified && !(data.qualificationNotes?.trim())) fail('确认审校资格时必须记录核验依据。');
    return data;
  }] },
  fields: [
    text('name', '显示姓名', true), text('professionalTitle', '专业领域 / 职称'),
    { name: 'roles', label: '后台角色', type: 'select', hasMany: true, required: true, defaultValue: ['editor'], options: [
      { label: '管理员', value: 'admin' }, { label: '内容编辑', value: 'editor' },
      { label: '医学审校', value: 'reviewer' }, { label: '发布管理', value: 'publisher' },
    ], access: { create: admin, update: admin } },
    { name: 'qualificationVerified', label: '医学审校资格已人工核验', type: 'checkbox', defaultValue: false, access: { create: admin, update: admin } },
    { name: 'qualificationNotes', label: '资格核验依据（仅后台可见）', type: 'textarea', access: { read: admin, create: admin, update: admin } },
  ],
};

export const Sources: CollectionConfig = {
  slug: 'sources', labels: { singular: '参考来源', plural: '参考来源库' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'publisher', 'licenseStatus', 'checkedAt', 'nextReviewAt', 'availability'], description: '登记具体原文。复核日期由编辑安排；到期不等于内容有误，可访问也不等于已获转载许可或已完成医学审校。' },
  access: { read: member, create: edit, update: edit, delete: never, readVersions: member },
  versions: { maxPerDoc: 100 },
  hooks: {
    beforeValidate: [({ data, originalDoc }) => {
      const merged = { ...originalDoc, ...data };
      if (merged.nextReviewAt && merged.checkedAt && new Date(merged.nextReviewAt) <= new Date(merged.checkedAt)) fail('下次复核日期应晚于本次核验日期。');
      if (['changed', 'unavailable'].includes(merged.availability) && !merged.reviewNotes?.trim()) fail('发现来源变化或不可用时，请记录复核说明。');
      return data;
    }],
    afterChange: [async ({ req, doc, operation }) => {
      if (operation === 'update') await audit(req, 'source-update', `sources:${doc.id}`, '来源记录已更新；请评估相关已发布内容是否需要复核或撤回。');
    }],
  },
  fields: [
    text('title', '原文标题', true), text('publisher', '发布机构', true),
    { ...text('url', '原文 HTTPS 链接', true), unique: true, validate: (v: any) => { try { return new URL(v).protocol === 'https:' || '请填写 HTTPS 链接'; } catch { return '链接格式不正确'; } } } as Field,
    { name: 'sourceType', label: '来源类型', type: 'select', defaultValue: '机构健康科普', options: ['机构健康科普', '指南/共识', '系统综述', '其他'], required: true },
    { name: 'language', label: '语言', type: 'select', options: ['zh', 'en', 'other'], defaultValue: 'en', required: true },
    text('region', '适用地区'), text('edition', '版本 / 指南年份'),
    { name: 'publicationDate', label: '原文发布日期', type: 'date' },
    { name: 'checkedAt', label: '链接与内容核验日期', type: 'date', required: true },
    { name: 'nextReviewAt', label: '下次人工复核日期', type: 'date', index: true, admin: { description: '留空表示尚未安排，后台首页单独提醒。不会自动标记为已复核。' } },
    { name: 'availability', label: '最近人工检查结果', type: 'select', defaultValue: 'unchecked', options: [
      { label: '尚未重新检查', value: 'unchecked' }, { label: '已检查，可用', value: 'available' },
      { label: '原文发生变化，需要评估', value: 'changed' }, { label: '链接不可用', value: 'unavailable' },
    ] },
    { name: 'reviewNotes', label: '复核说明（内部）', type: 'textarea' },
    { name: 'licenseStatus', label: '引用 / 使用权限', type: 'select', required: true, defaultValue: 'unverified', options: [
      { label: '尚未核对', value: 'unverified' }, { label: '仅作为依据链接，正文为原创科普整理', value: 'citation-only' },
      { label: '已取得明确许可', value: 'licensed' }, { label: '已核验公共领域 / 开放许可', value: 'open' },
    ] },
    { name: 'licenseNotes', label: '许可依据、链接及允许使用范围', type: 'textarea' },
  ],
};

export const Categories: CollectionConfig = {
  slug: 'categories', labels: { singular: '分类', plural: '知识分类' },
  admin: { useAsTitle: 'name' }, access: { read: member, create: edit, update: edit, delete: never },
  fields: [{ ...text('slug', '稳定标识', true), unique: true } as Field, text('name', '分类名称', true)],
};

export const Articles: CollectionConfig = {
  slug: 'articles', labels: { singular: '知识草稿', plural: '知识编辑' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'kind', 'slug', 'contentRisk', 'scopeConfirmed', 'updatedAt'], description: '这里保存编辑草稿。基础知识完成来源核对后即可发布；疾病、数值标准、特殊人群和诊疗内容不在当前产品范围。保存草稿不会自动上线。' },
  access: { read: member, create: edit, update: edit, delete: never, readVersions: member },
  versions: { maxPerDoc: 100 },
  hooks: {
    beforeValidate: [({ data, originalDoc }) => {
      if (!data) return data;
      const merged = { ...originalDoc, ...data };
      const keys = (merged.citations || []).map((c: any) => c.key);
      if (new Set(keys).size !== keys.length) fail('同一篇内容的来源编号不可重复。');
      if (keys.some((key: string) => !/^[a-z0-9-]+$/.test(key))) fail('来源编号只能包含英文小写、数字和连字符。');
      for (const ids of [splitKeys(merged.descriptionSourceKeys), splitKeys(merged.tipSourceKeys), splitKeys(merged.chainSourceKeys), ...(merged.metrics || []).map((m: any) => splitKeys(m.sourceKeys))]) {
        if (ids.some((id: string) => !keys.includes(id))) fail('正文引用了不存在的来源编号。');
      }
      return merged;
    }],
    beforeChange: [async ({ data, req, originalDoc }) => {
      if (originalDoc?.id && (data.slug !== originalDoc.slug || data.kind !== originalDoc.kind)) fail('已有知识的类型与标识不可修改，以保护链接和收藏。');
      if (data.relatedIndicators?.some((r: any) => relationID(r) === originalDoc?.id) || data.relatedOrgans?.some((r: any) => relationID(r) === originalDoc?.id)) fail('关联内容不能指向自身。');
      const category = await req.payload.count({ collection: 'categories', where: { slug: { equals: data.category } }, req, overrideAccess: true });
      if (!category.totalDocs) fail('分类标识不存在，请先在知识分类中创建。');
      data.key = `${data.kind}:${data.slug}`;
      data.lastEditedBy = req.user?.id || data.lastEditedBy;
      return data;
    }],
  },
  fields: [
    { name: 'key', type: 'text', unique: true, admin: { hidden: true } },
    { name: 'kind', label: '内容类型', type: 'select', options: [{ label: '指标', value: 'indicator' }, { label: '器官', value: 'organ' }], required: true },
    { ...text('slug', '稳定标识（英文小写 / 数字 / 连字符）', true), validate: (v: any) => /^[a-z0-9-]+$/.test(v) || '标识只能包含英文小写、数字和连字符' } as Field,
    text('title', '中文标题', true), text('subtitle', '一句话介绍', true), text('english', '英文名称'),
    text('category', '分类标识', true),
    { name: 'aliases', label: '搜索别名与缩写', type: 'textarea' },
    { name: 'tags', label: '标签', type: 'array', fields: [text('text', '标签', true)] },
    { name: 'applicability', label: '适用人群与地区', type: 'textarea', required: true },
    { name: 'limitations', label: '适用限制与特殊条件', type: 'textarea' },
    { name: 'scopeConfirmed', label: '编辑已核对适用范围', type: 'checkbox', defaultValue: false },
    { name: 'contentRisk', label: '内容风险范围', type: 'select', defaultValue: 'clinical', options: [
      { label: '基础知识（解剖、生理、术语）', value: 'foundational' },
      { label: '高风险（疾病、数值标准、特殊人群、诊疗相关）', value: 'clinical' },
    ], admin: { description: '旧内容和无法确认边界的内容默认按高风险处理。该字段不能替代来源与表达检查。' } },
    { name: 'description', label: '基础解释', type: 'textarea', required: true },
    text('descriptionSourceKeys', '基础解释来源编号（逗号分隔）'),
    { name: 'metrics', label: '指标分工', type: 'array', admin: { condition: indicatorOnly }, fields: [text('name', '名称', true), { name: 'text', label: '解释', type: 'textarea', required: true }, text('sourceKeys', '来源编号（逗号分隔）')] },
    { name: 'chain', label: '过程示意', type: 'array', admin: { condition: indicatorOnly }, fields: [text('text', '步骤', true)] },
    { ...text('chainSourceKeys', '过程示意来源编号（逗号分隔）'), admin: { condition: indicatorOnly } } as Field,
    { name: 'tip', label: '阅读提示', type: 'textarea', admin: { condition: indicatorOnly } },
    { ...text('tipSourceKeys', '阅读提示来源编号（逗号分隔）'), admin: { condition: indicatorOnly } } as Field,
    text('organLabel', '关联说明'),
    { name: 'learning', label: '互动学习脚本（JSON）', type: 'json', admin: { condition: (_: any, sibling: any) => sibling.kind === 'organ', description: '支持已登记的心脏循环与肺部气体交换类型；结构、步骤和理解题都必须使用本文已有来源编号。' } },
    { name: 'relatedOrgans', label: '关联器官', type: 'relationship', relationTo: 'articles', hasMany: true, filterOptions: { kind: { equals: 'organ' } } },
    { name: 'relatedIndicators', label: '关联指标', type: 'relationship', relationTo: 'articles', hasMany: true, filterOptions: { kind: { equals: 'indicator' } } },
    { name: 'citations', label: '本文引用', type: 'array', required: true, minRows: 1, fields: [
      text('key', '本文来源编号', true), { name: 'source', label: '来源库记录', type: 'relationship', relationTo: 'sources', required: true },
      { name: 'scope', label: '支撑哪些知识点', type: 'textarea', required: true },
      text('locator', '页码 / 段落标题 / 原文锚点（正式发布前必填）'),
    ] },
    { name: 'featured', label: '首页精选', type: 'checkbox', defaultValue: false },
    { name: 'icon', label: '图标', type: 'select', options: ['droplet', 'heart-pulse', 'layers', 'heart'], defaultValue: 'heart' },
    { name: 'color', label: '配色', type: 'select', options: ['orange', 'purple', 'blue', 'green'], defaultValue: 'green' },
    text('number', '展示序号'),
    { name: 'lastEditedBy', label: '最后编辑', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
  ],
};

export const Reviews: CollectionConfig = {
  slug: 'reviews', labels: { singular: '审校记录', plural: '医学审校' },
  admin: { defaultColumns: ['article', 'decision', 'reviewer', 'createdAt'], description: '审校记录不可修改，并绑定当时的内容及来源快照。正文或来源变化后需要重新审校。' },
  access: { read: member, create: ({ req }) => hasRole(req.user, 'reviewer'), update: never, delete: never },
  hooks: {
    beforeChange: [async ({ data, req, operation }) => {
      if (operation !== 'create') fail('审校记录不可修改。');
      if (!req.user || !hasRole(req.user, 'reviewer') || !req.user.qualificationVerified) return fail('只有经人工核验资格的医学审校人可以记录审校结论。', 403);
      const snapshot = await snapshotArticle(req, relationID(data.article));
      if (relationID(snapshot.article.lastEditedBy) === req.user.id) fail('不能审校自己最后编辑的版本。', 403);
      if (data.decision === 'approved') validateForReview(snapshot);
      data.reviewer = req.user.id;
      data.contentHash = snapshot.hash;
      data.snapshot = { body: snapshot.body, summary: snapshot.summary };
      data.reviewerDisplay = { name: req.user.name, professionalTitle: req.user.professionalTitle || '', reviewedAt: new Date().toISOString() };
      return data;
    }],
    afterChange: [async ({ req, doc }) => { await audit(req, 'review', `reviews:${doc.id}`, `${doc.decision}; hash=${doc.contentHash}`); }],
  },
  fields: [
    { name: 'article', label: '待审校知识', type: 'relationship', relationTo: 'articles', required: true },
    { name: 'decision', label: '审校结论', type: 'select', options: [{ label: '通过', value: 'approved' }, { label: '需修订', value: 'changes-requested' }], required: true },
    { name: 'notes', label: '审校意见', type: 'textarea', required: true },
    { name: 'reviewer', label: '审校人', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
    { name: 'contentHash', label: '内容与来源指纹', type: 'text', admin: { readOnly: true } },
    { name: 'snapshot', label: '审校快照', type: 'json', admin: { readOnly: true } },
    { name: 'reviewerDisplay', label: '公开审校信息快照', type: 'json', admin: { readOnly: true } },
  ],
};

export const Releases: CollectionConfig = {
  slug: 'releases', labels: { singular: '内容修订', plural: '可发布修订' },
  admin: { useAsTitle: 'label', defaultColumns: ['label', 'channel', 'publicationBasis', 'createdAt'], description: '从当前草稿生成不可变快照。正式修订可基于专业审校，或对低风险基础知识做来源整理核对；两种状态公开区分。' },
  access: { read: member, create: publish, update: never, delete: never },
  hooks: { beforeChange: [async ({ data, req, operation }) => {
    if (operation !== 'create') fail('内容修订不可修改；请创建新的修订。');
    const s = await snapshotArticle(req, relationID(data.article));
    let reviewer = null;
    let sourceCheck = null;
    if (data.channel === 'official') {
      if (data.publicationBasis === 'source-curated') {
        validateForSourcePublication(s);
        if (!data.sourceCheckNotes?.trim()) fail('来源整理发布必须记录核对范围、图示简化和未覆盖内容。');
        data.review = null;
        data.sourceCheckBy = req.user?.id || null;
        data.sourceCheckedAt = new Date().toISOString();
        sourceCheck = { checkedAt: data.sourceCheckedAt, statement: '维护者已核对本版本的具体来源、表达与示意边界。' };
      } else {
        if (!data.review) fail('专业审校发布必须选择医学审校记录。');
        const review: any = await req.payload.findByID({ collection: 'reviews', id: relationID(data.review), req, depth: 0, overrideAccess: true });
        if (relationID(review.article) !== s.article.id || review.decision !== 'approved' || review.contentHash !== s.hash) fail('审校记录与当前正文或来源不一致，请重新审校。');
        const user: any = await req.payload.findByID({ collection: 'users', id: relationID(review.reviewer), req, overrideAccess: true });
        if (!user.qualificationVerified || !hasRole(user, 'reviewer')) fail('审校资格当前不可用。');
        validateForReview(s);
        reviewer = review.reviewerDisplay;
      }
    } else if (!hasRole(req.user, 'admin')) fail('仅管理员可以创建明确标识为待核对的演示修订。', 403);
    data.label = `${s.article.title} · ${data.channel === 'official' ? '正式' : '演示'} · ${new Date().toISOString()}`;
    data.kind = s.article.kind; data.slug = s.article.slug;
    data.contentHash = s.hash;
    data.publicData = { ...s.body,
      references: s.body.references.map(({ licenseNotes, sourceRecordID, ...reference }: any) => reference),
      reviewStatus: reviewer ? 'reviewed' : 'pending', review: reviewer,
      publicationBasis: data.channel === 'demo' ? 'demo' : reviewer ? 'professional-review' : 'source-curated',
      sourceCheck, demo: data.channel === 'demo' };
    data.summary = { ...s.summary, reviewStatus: reviewer ? 'reviewed' : 'pending',
      publicationBasis: data.channel === 'demo' ? 'demo' : reviewer ? 'professional-review' : 'source-curated',
      sourceCheck, demo: data.channel === 'demo' };
    data.createdBy = req.user?.id || null;
    return data;
  }] },
  fields: [
    { name: 'article', label: '知识草稿', type: 'relationship', relationTo: 'articles', required: true },
    { name: 'channel', label: '发布集合', type: 'select', required: true, defaultValue: 'official', options: [{ label: '正式', value: 'official' }, { label: '演示（来源尚未完成核对）', value: 'demo' }] },
    { name: 'publicationBasis', label: '正式发布依据', type: 'select', required: true, defaultValue: 'professional-review', options: [
      { label: '版本绑定的专业审校', value: 'professional-review' },
      { label: '基础知识来源整理', value: 'source-curated' },
    ], admin: { condition: (_: any, sibling: any) => sibling.channel === 'official' } },
    { name: 'review', label: '通过的医学审校记录', type: 'relationship', relationTo: 'reviews' },
    { name: 'sourceCheckNotes', label: '来源、表达、图示简化及未覆盖范围核对记录', type: 'textarea', admin: { condition: (_: any, sibling: any) => sibling.channel === 'official' && sibling.publicationBasis === 'source-curated' } },
    { name: 'sourceCheckBy', label: '来源整理核对人', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
    { name: 'sourceCheckedAt', label: '来源整理核对时间', type: 'date', admin: { readOnly: true } },
    ...['label', 'kind', 'slug', 'contentHash'].map(name => ({ name, type: 'text', admin: { readOnly: true } } as Field)),
    { name: 'publicData', label: '正文快照', type: 'json', admin: { readOnly: true } },
    { name: 'summary', label: '摘要快照', type: 'json', admin: { readOnly: true } },
    { name: 'createdBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
  ],
};

export const Publications: CollectionConfig = {
  slug: 'publications', labels: { singular: '发布入口', plural: '上线 / 回滚 / 撤回' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'channel', 'withdrawn', 'updatedAt'], description: '选择不可变修订后保存即上线。改选历史修订即回滚；勾选撤回立即停止 API 展示。每个集合内每篇知识仅有一个入口。' },
  access: { read: member, create: publish, update: publish, delete: never },
  hooks: {
    beforeChange: [async ({ data, req, originalDoc }) => {
      data = { ...originalDoc, ...data };
      const release: any = await req.payload.findByID({ collection: 'releases', id: relationID(data.release), req, depth: 0, overrideAccess: true });
      const key = `${release.channel}:${release.kind}:${release.slug}`;
      if (originalDoc?.id && originalDoc.key !== key) fail('不能用另一篇知识或另一个集合替换已有入口。');
      if (release.channel === 'official' && !(
        release.publicData?.reviewStatus === 'reviewed' ||
        (release.publicData?.publicationBasis === 'source-curated' && release.publicData?.sourceCheck?.checkedAt)
      )) fail('正式入口需要匹配的专业审校或基础知识来源整理记录。');
      if (data.withdrawn && !data.reason?.trim()) fail('撤回时请说明原因。');
      Object.assign(data, { key, channel: release.channel, kind: release.kind, slug: release.slug,
        title: release.summary.title, category: release.summary.category, featured: release.summary.featured,
        searchText: release.summary.searchText, summary: release.summary,
        publicData: { ...release.publicData, version: release.id, releaseID: release.id },
      });
      return data;
    }],
    afterChange: [async ({ req, doc, previousDoc }) => { await audit(req,
      doc.withdrawn ? 'withdraw' : previousDoc?.id ? 'switch-release' : 'publish',
      `publications:${doc.id}`, `release=${relationID(doc.release)}; ${doc.reason || ''}`,
    ); }],
  },
  fields: [
    { name: 'release', label: '选择要展示的内容修订（改选旧修订可回滚）', type: 'relationship', relationTo: 'releases', required: true },
    { name: 'withdrawn', label: '撤回 / 停止公开展示', type: 'checkbox', defaultValue: false },
    { name: 'reason', label: '发布 / 回滚 / 撤回说明', type: 'textarea', required: true },
    { name: 'key', type: 'text', unique: true, admin: { readOnly: true } },
    ...['title', 'channel', 'kind', 'slug', 'category', 'searchText'].map(name => ({ name, type: 'text', index: ['channel', 'kind', 'slug', 'category'].includes(name), admin: { readOnly: true } } as Field)),
    { name: 'featured', type: 'checkbox', admin: { readOnly: true } },
    { name: 'summary', type: 'json', admin: { readOnly: true } },
    { name: 'publicData', type: 'json', admin: { readOnly: true } },
  ],
};

export const AuditEvents: CollectionConfig = {
  slug: 'audit-events', labels: { singular: '审计记录', plural: '操作审计' },
  admin: { defaultColumns: ['action', 'target', 'actor', 'createdAt'] },
  access: { read: member, create: never, update: never, delete: never },
  hooks: { beforeChange: [({ data, req, operation }) => {
    if (operation !== 'create' || !req.context.internalAudit) fail('审计记录只由系统追加。', 403);
    return data;
  }] },
  fields: [text('action', '操作', true), text('target', '目标', true), { name: 'detail', label: '详情', type: 'textarea' }, { name: 'actor', label: '操作者', type: 'relationship', relationTo: 'users' }],
};
