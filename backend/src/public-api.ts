import { getPayload, type Where } from 'payload';
import config from './payload.config';

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers });

export async function publicContent(request: Request, channel: 'demo' | 'official', parts: string[]) {
  if (channel === 'demo' && process.env.ENABLE_DEMO_API !== 'true') return json({ error: 'not_found' }, 404);
  const payload = await getPayload({ config });
  const base: Where = { and: [{ channel: { equals: channel } }, { withdrawn: { equals: false } }] };
  if (parts.length === 3 && parts[0] === 'content') {
    const [, kind, slug] = parts;
    if (!['indicator', 'organ'].includes(kind) || !/^[a-z0-9-]+$/.test(slug)) return json({ error: 'not_found' }, 404);
    const result = await payload.find({ collection: 'publications', depth: 0, limit: 1, overrideAccess: true,
      where: { and: [base, { kind: { equals: kind } }, { slug: { equals: slug } }] }, select: { publicData: true },
    });
    return result.docs[0] ? json(result.docs[0].publicData) : json({ error: 'not_found' }, 404);
  }
  if (parts.length !== 1 || parts[0] !== 'content') return json({ error: 'not_found' }, 404);
  const params = new URL(request.url).searchParams;
  const kind = params.get('kind');
  const query = params.get('query')?.trim() || '';
  const category = params.get('category');
  const rawLimit = params.get('limit') || '6';
  const rawCursor = params.get('cursor') || '0';
  if ((kind && !['indicator', 'organ'].includes(kind)) || !/^\d+$/.test(rawLimit) || !/^\d+$/.test(rawCursor) || query.length > 200) return json({ error: 'invalid_query' }, 400);
  const limit = Math.min(24, Math.max(1, Number(rawLimit)));
  const offset = Number(rawCursor);
  if (!Number.isSafeInteger(offset) || offset > 100000 || offset % limit !== 0) return json({ error: 'invalid_cursor' }, 400);
  const filters: Where[] = [base];
  if (kind) filters.push({ kind: { equals: kind } });
  if (query) filters.push({ searchText: { contains: query } });
  if (category) filters.push({ category: { equals: category } });
  if (params.get('featured') === 'true') filters.push({ featured: { equals: true } });
  const ids = params.has('ids') ? params.get('ids')!.split(',').filter(Boolean) : null;
  if (ids && (ids.length > 200 || ids.some(id => !/^[a-z0-9-]+$/.test(id)))) return json({ error: 'invalid_ids' }, 400);
  if (ids?.length) filters.push({ slug: { in: ids } });
  const [result, categoryRecords] = await Promise.all([
    ids?.length === 0 ? Promise.resolve({ docs: [], totalDocs: 0, hasNextPage: false }) : payload.find({
      collection: 'publications', overrideAccess: true, depth: 0, limit, page: offset / limit + 1,
      sort: 'id', where: { and: filters }, select: { summary: true },
    }),
    payload.find({ collection: 'categories', overrideAccess: true, depth: 0, pagination: false, sort: 'id' }),
  ]);
  // Available categories are based on kind, not on the current query or saved IDs.
  const categoryCounts = await Promise.all(categoryRecords.docs.map(async c => {
    const count = await payload.count({ collection: 'publications', overrideAccess: true,
      where: { and: [base, ...(kind ? [{ kind: { equals: kind } }] : []), { category: { equals: c.slug } }] },
    });
    return count.totalDocs ? { id: c.slug, name: c.name } : null;
  }));
  return json({ items: result.docs.map((d: any) => {
    const { searchText, ...summary } = d.summary;
    return summary;
  }), total: result.totalDocs,
    nextCursor: result.hasNextPage ? String(offset + limit) : null,
    categories: categoryCounts.filter(Boolean), channel,
  });
}
