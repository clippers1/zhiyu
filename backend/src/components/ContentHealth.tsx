import React from 'react';
import type { ServerProps, Where } from 'payload';
import { hasRole } from '../domain';

function listURL(collection: string, field: string, operator: string, value: string) {
  return `/admin/collections/${collection}?${new URLSearchParams({ [`where[${field}][${operator}]`]: value })}`;
}

export async function ContentHealth({ payload, user }: ServerProps) {
  if (!user) return null;
  const now = new Date().toISOString();
  const overdue: Where = { nextReviewAt: { less_than_equal: now } };
  const unscheduled: Where = { nextReviewAt: { exists: false } };
  const changed: Where = { availability: { in: ['changed', 'unavailable'] } };
  const counts = await Promise.all([overdue, unscheduled, changed].map(where => payload.count({ collection: 'sources', where, overrideAccess: false, user })));
  const canManage = hasRole(user, 'admin', 'editor');
  const feedbackCount = canManage ? await payload.count({ collection: 'feedback', overrideAccess: false, user, where: { status: { in: ['new', 'triaging', 'awaiting-review'] } } }) : null;
  const attention = await payload.find({ collection: 'sources', overrideAccess: false, user, depth: 0, limit: 5,
    where: { or: [overdue, changed] }, sort: 'nextReviewAt' });
  const affected = await Promise.all(attention.docs.map(async (source: any) => ({ source, count: (await payload.count({
    collection: 'articles', overrideAccess: false, user, where: { 'citations.source': { equals: source.id } },
  })).totalDocs })));
  const cards = [
    { label: '来源到期复核', count: counts[0].totalDocs, href: listURL('sources', 'nextReviewAt', 'less_than_equal', now) },
    { label: '尚未安排复核', count: counts[1].totalDocs, href: listURL('sources', 'nextReviewAt', 'exists', 'false') },
    { label: '来源变化 / 不可用', count: counts[2].totalDocs, href: listURL('sources', 'availability', 'in', 'changed,unavailable') },
    ...(feedbackCount ? [{ label: '待处理读者纠错', count: feedbackCount.totalDocs, href: listURL('feedback', 'status', 'in', 'new,triaging,awaiting-review') }] : []),
  ];
  return <section style={{ marginBottom: 32 }} aria-label="内容维护待办">
    <h2>内容维护待办</h2>
    <p>到期是人工检查提醒，不代表内容已失效。处理纠错也不等于完成医学审校。</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
      {cards.map(card => <a key={card.label} href={card.href} style={{ padding: 18, border: '1px solid var(--theme-elevation-150)', borderRadius: 8 }}>
        <strong style={{ fontSize: 28, display: 'block' }}>{card.count}</strong>{card.label}
      </a>)}
    </div>
    {affected.length > 0 && <div style={{ marginTop: 20 }}>
      <h3>需要检查的来源（最多展示 5 条）</h3>
      <ul>{affected.map(({ source, count }) => <li key={source.id} style={{ marginBottom: 12 }}>
        <a href={`/admin/collections/sources/${source.id}`}>{source.title}</a>
        {' · '}<a href={listURL('articles', 'citations.source', 'equals', String(source.id))}>{count} 篇关联草稿</a>
      </li>)}</ul>
      <p>关联列表基于当前草稿。历史发布快照不会自动改变；请另行检查相关发布入口，必要时撤回。</p>
    </div>}
  </section>;
}
