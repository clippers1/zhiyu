import type { Payload, Where } from 'payload';
import { normalizeSearch, searchSuggestions } from '../reader/services/search.js';

// Fixed SQL expressions only. User input is always passed as query parameters.
// PostgreSQL and the offline adapter use the same NFKC + lowercase + character set.
const normalized = (field: string) => `regexp_replace(lower(normalize(coalesce(${field}, ''), NFKC)) COLLATE "C", '[^a-z0-9一-鿿]', '', 'g')`;

export async function searchPublished(payload: Payload, options: {
  channel: string; kind: string | null; category: string | null; ids: string[] | null;
  featured: boolean; query: string; offset: number; limit: number; filters: Where[];
}) {
  const { channel, kind, category, ids, featured, query, offset, limit, filters } = options;
  if (ids?.length === 0) return { items: [], total: 0, nextCursor: null, suggestions: [] };
  const needle = normalizeSearch(query);
  const result = await payload.db.pool.query(`
    WITH candidates AS (
      SELECT id, summary,
        ${normalized('title')} AS title_key,
        ${normalized("summary->>'english'")} AS english_key,
        ${normalized("summary->>'subtitle'")} AS subtitle_key,
        ${normalized('search_text')} AS text_key,
        ARRAY(SELECT ${normalized('tag')} FROM jsonb_array_elements_text(coalesce(summary->'tags', '[]'::jsonb)) AS tag) AS tag_keys
      FROM publications
      WHERE channel = $1 AND withdrawn = false
        AND ($2::text IS NULL OR kind = $2)
        AND ($3::text IS NULL OR category = $3)
        AND ($4::text[] IS NULL OR slug = ANY($4))
        AND (NOT $5::boolean OR featured = true)
    ), matches AS (
      SELECT *, CASE
        WHEN title_key = $6 THEN 0
        WHEN english_key = $6 OR $6 = ANY(tag_keys) THEN 1
        WHEN position($6 in title_key) > 0 THEN 2
        WHEN position($6 in english_key) > 0 OR EXISTS(SELECT 1 FROM unnest(tag_keys) t WHERE position($6 in t) > 0) THEN 3
        ELSE 4 END AS rank
      FROM candidates
      WHERE $6 <> '' AND (position($6 in title_key) > 0 OR position($6 in english_key) > 0
        OR position($6 in subtitle_key) > 0 OR position($6 in text_key) > 0
        OR EXISTS(SELECT 1 FROM unnest(tag_keys) t WHERE position($6 in t) > 0))
    ), page AS (SELECT * FROM matches ORDER BY rank, id OFFSET $7 LIMIT $8)
    SELECT (SELECT count(*)::integer FROM matches) AS total,
      coalesce((SELECT jsonb_agg((summary - 'searchText') || jsonb_build_object('match',
        CASE rank WHEN 0 THEN '标题' WHEN 1 THEN '英文名称或标签' WHEN 2 THEN '标题' WHEN 3 THEN '英文名称或标签' ELSE '正文或别名' END)
        ORDER BY rank, id) FROM page), '[]'::jsonb) AS items
  `, [channel, kind, category, ids, featured, needle, offset, limit]);
  const { total, items } = result.rows[0];
  let suggestions: string[] = [];
  if (total === 0 && /^[a-z0-9]{4,}$/.test(needle)) {
    // Suggestions are best-effort and bounded; never expose drafts or ignore filters.
    const candidates = await payload.find({ collection: 'publications', overrideAccess: true, depth: 0,
      where: { and: filters }, limit: 200, sort: 'id', select: { summary: true } });
    suggestions = searchSuggestions(candidates.docs.map(doc => doc.summary), query);
  }
  return { items, total, nextCursor: offset + limit < total ? String(offset + limit) : null, suggestions };
}
