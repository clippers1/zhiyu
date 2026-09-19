import { cache } from 'react';
import type { Metadata } from 'next';
import { getPayload } from 'payload';
import config from './payload.config';
import { publicContent } from './public-api';
import { parseRoute, routePath } from '../reader/services/routes.js';

export function siteChannel(): 'official' | 'demo' {
  const value = process.env.SITE_CONTENT_CHANNEL || 'official';
  if (value !== 'official' && value !== 'demo') throw new Error('SITE_CONTENT_CHANNEL must be official or demo');
  return value;
}
export const siteOrigin = () => new URL(process.env.SERVER_URL || 'http://localhost:3108').origin;

// No HTTP round trip or persistent cache: page HTML, metadata and hydration share
// this request's published snapshot. Drafts and private source fields never enter it.
export async function buildPage(pathname: string) {
  const route = parseRoute(pathname);
  if (route.page === 'not-found') return null;
  const channel = siteChannel();
  if (channel === 'demo' && process.env.ENABLE_DEMO_API !== 'true') return null;
  const preloaded: Record<string, any> = {};
  async function load(method: 'list' | 'get', args: any[]) {
    const params = new URLSearchParams();
    if (method === 'list') for (const [key, value] of Object.entries(args[0])) {
      if (value !== '' && value !== undefined) params.set(key, Array.isArray(value) ? value.join(',') : String(value));
    }
    const parts = method === 'get' ? ['content', ...args] : ['content'];
    const response = await publicContent(new Request(`${siteOrigin()}/api/${channel}/${parts.join('/')}?${params}`), channel, parts);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Published content is temporarily unavailable');
    const value = await response.json();
    preloaded[`${method}:${JSON.stringify(args)}`] = value;
    return value;
  }
  let detail: any = null;
  if (route.page === 'article') {
    detail = await load('get', ['indicator', route.id]);
    if (!detail) return null;
    await load('list', [{ kind: 'organ', ids: (detail.relatedOrgans || []).map((item: any) => item.id), limit: 24 }]);
  } else if (route.page === 'organs') {
    detail = await load('get', ['organ', route.id]);
    if (!detail) return null;
    await Promise.all([
      load('list', [{ kind: 'organ', limit: 24 }]),
      load('list', [{ kind: 'indicator', ids: detail.related || [], limit: 24 }]),
    ]);
  } else if (route.page === 'map') {
    await Promise.all([
      load('list', [{ kind: 'indicator', featured: true, limit: 3 }]),
      load('list', [{ kind: 'organ', limit: 24 }]),
    ]);
  } else if (route.page === 'indicators') {
    await load('list', [{ kind: 'indicator', query: '', category: '', cursor: '0', limit: 6 }]);
  }
  // Saved IDs only exist in the browser. Never pre-render another reader's collection.
  return { route, detail, preloaded, channel, canonical: `${siteOrigin()}${routePath(route.page, route.id)}`,
    runtime: { apiBase: channel === 'demo' ? '/api/demo' : '/api/v1', feedbackBase: '/api/feedback', serverRendered: true },
  };
}
export const loadPage = cache(buildPage);

export function pageMetadata(page: Awaited<ReturnType<typeof buildPage>>): Metadata {
  if (!page) return { title: '内容不存在或已撤回 · 知愈', robots: { index: false, follow: false } };
  const titles: Record<string, string> = { map: '知愈 · 让健康变得好懂', indicators: '指标百科 · 知愈', saved: '我的收藏 · 知愈' };
  const title = page.detail ? `${page.detail.title || page.detail.name}：${page.detail.subtitle || page.detail.headline} · 知愈` : titles[page.route.page];
  const description = `${page.channel === 'demo' ? 'Beta 科普内容，待专业审校。' : ''}${page.detail?.subtitle || page.detail?.headline || '用有来源的图文和互动认识体检指标、器官与身体之间的联系。'}内容用于健康科普，不替代医生诊断。`;
  const index = page.channel === 'official' && page.route.page !== 'saved';
  return {
    title, description, alternates: { canonical: page.canonical }, robots: { index, follow: true },
    openGraph: { title, description, url: page.canonical, siteName: '知愈', locale: 'zh_CN', type: page.detail ? 'article' : 'website',
      ...(page.detail ? { modifiedTime: page.detail.updatedAt } : {}),
    },
    twitter: { card: 'summary', title, description },
  };
}

const escapeXML = (value: string) => value.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!);
export async function sitemapXML() {
  const entries: { url: string; modified?: string }[] = [];
  // Demonstration material must not be advertised as search-ready medical knowledge.
  if (siteChannel() === 'official') {
    const payload = await getPayload({ config });
    const publications = await payload.find({ collection: 'publications', overrideAccess: true, depth: 0, limit: 49998,
      where: { and: [{ channel: { equals: 'official' } }, { withdrawn: { equals: false } }] },
      select: { kind: true, slug: true, updatedAt: true }, sort: 'id',
    });
    entries.push({ url: `${siteOrigin()}/` }, { url: `${siteOrigin()}/indicators` });
    for (const doc of publications.docs) entries.push({ url: `${siteOrigin()}${doc.kind === 'organ' ? '/organs/' : '/article/'}${doc.slug}`, modified: typeof doc.updatedAt === 'string' ? doc.updatedAt : undefined });
  }
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(entry => `<url><loc>${escapeXML(entry.url)}</loc>${entry.modified ? `<lastmod>${escapeXML(entry.modified)}</lastmod>` : ''}</url>`).join('')}</urlset>`;
}
