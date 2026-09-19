import { siteOrigin } from '../../../site';
export const dynamic = 'force-dynamic';
export function GET() {
  return new Response(`User-agent: *\nDisallow: /admin\nDisallow: /api/\nDisallow: /saved\nSitemap: ${siteOrigin()}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
