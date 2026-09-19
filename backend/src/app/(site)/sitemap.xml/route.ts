import { sitemapXML } from '../../../site';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return new Response(await sitemapXML(), { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-store' } }); }
  catch { return new Response('Sitemap temporarily unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
