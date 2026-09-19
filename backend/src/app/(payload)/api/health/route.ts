import { getPayload } from 'payload';
import config from '@payload-config';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const payload = await getPayload({ config });
    await payload.count({ collection: 'categories', overrideAccess: true });
    return Response.json({ status: 'ok', service: 'zhiyu-content' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
