import { createHash, createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { getPayload, type Payload } from 'payload';
import config from './payload.config';

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
const json = (body: unknown, status = 200, extra = {}) => Response.json(body, { status, headers: { ...headers, ...extra } });
const hashReceipt = (token: string) => createHash('sha256').update(token).digest('hex');
const kinds = ['indicator', 'organ'];
const categories = ['accuracy', 'source', 'clarity', 'experience'];
const maxBytes = 8192;

async function readBody(request: Request) {
  if (Number(request.headers.get('content-length')) > maxBytes) throw new Error('too_large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid_body');
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > maxBytes) { await reader.cancel(); throw new Error('too_large'); }
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('invalid_body');
    return body;
  } finally { reader.releaseLock(); }
}

export async function consumeFeedbackLimit(payload: Payload, request: Request, action: string) {
  // Only opt in behind a proxy that OVERWRITES X-Real-IP; never trust X-Forwarded-For.
  const headerIP = request.headers.get('x-real-ip') || '';
  const identity = process.env.FEEDBACK_TRUST_PROXY === 'true' && isIP(headerIP) ? headerIP : 'shared-untrusted-origin';
  const windowSeconds = action === 'submit' ? 3600 : 60;
  const maximum = action === 'submit' ? 5 : 30;
  const resetAt = new Date((Math.floor(Date.now() / (windowSeconds * 1000)) + 1) * windowSeconds * 1000);
  const key = createHmac('sha256', process.env.PAYLOAD_SECRET!).update(`${action}:${resetAt.toISOString()}:${identity}`).digest('hex');
  // PostgreSQL UPSERT makes concurrent requests and multiple CMS workers share one limit.
  const result = await payload.db.pool.query(
    `INSERT INTO feedback_throttles (key, hits, reset_at, created_at, updated_at)
     VALUES ($1, 1, $2, now(), now())
     ON CONFLICT (key) DO UPDATE SET hits = feedback_throttles.hits + 1, updated_at = now()
     RETURNING hits`, [key, resetAt],
  );
  await payload.db.pool.query('DELETE FROM feedback_throttles WHERE reset_at < now()');
  return { allowed: Number(result.rows[0].hits) <= maximum, retryAfter: Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000)) };
}

export async function feedbackAPI(request: Request, action: string) {
  if (!['submit', 'status', 'delete'].includes(action)) return json({ error: 'not_found' }, 404);
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
  // Tokens and message text belong in a JSON body, never in URLs or access logs.
  if (new URL(request.url).search) return json({ error: 'invalid_request' }, 400);
  const origin = process.env.SERVER_URL || 'http://localhost:3108';
  if (request.headers.get('origin') !== new URL(origin).origin) return json({ error: 'origin_not_allowed' }, 403);
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return json({ error: 'json_required' }, 415);
  try {
    const payload = await getPayload({ config });
    const rate = await consumeFeedbackLimit(payload, request, action);
    if (!rate.allowed) return json({ error: 'rate_limited' }, 429, { 'Retry-After': String(rate.retryAfter) });
    let body;
    try { body = await readBody(request); }
    catch (error) { return json({ error: (error as Error).message === 'too_large' ? 'too_large' : 'invalid_body' }, (error as Error).message === 'too_large' ? 413 : 400); }
    if (typeof body.receipt !== 'string' || !/^[a-f0-9]{64}$/.test(body.receipt)) return json({ error: 'invalid_receipt' }, 400);
    const receiptHash = hashReceipt(body.receipt);
    const findReceipt = async () => (await payload.find({ collection: 'feedback', overrideAccess: true, depth: 0, limit: 1, where: { receiptHash: { equals: receiptHash } } })).docs[0];
    const existing: any = await findReceipt();
    if (action === 'status') {
      if (!existing) return json({ error: 'not_found' }, 404);
      return json({ status: existing.status, publicReply: existing.publicReply || '', contentTitle: existing.contentTitle,
        version: existing.release, createdAt: existing.createdAt, updatedAt: existing.updatedAt });
    }
    if (action === 'delete') {
      if (!existing) return json({ error: 'not_found' }, 404);
      await payload.delete({ collection: 'feedback', id: existing.id, overrideAccess: true });
      return json({ deleted: true });
    }
    if (!kinds.includes(body.kind) || !['demo', 'official'].includes(body.channel) || typeof body.slug !== 'string' || !/^[a-z0-9-]{1,100}$/.test(body.slug)
      || !Number.isSafeInteger(body.releaseID) || body.releaseID < 1 || !categories.includes(body.category)
      || typeof body.message !== 'string' || body.message.trim().length < 10 || body.message.trim().length > 1500 || body.consent !== true) return json({ error: 'invalid_feedback' }, 400);
    const message = body.message.trim();
    if (existing) {
      if (existing.kind !== body.kind || existing.slug !== body.slug || existing.channel !== body.channel || existing.release !== body.releaseID
        || existing.category !== body.category || existing.message !== message) return json({ error: 'receipt_conflict' }, 409);
      return json({ received: true }); // Idempotent retry even if the content was subsequently withdrawn.
    }
    if (body.channel === 'demo' && process.env.ENABLE_DEMO_API !== 'true') return json({ error: 'content_unavailable' }, 404);
    const publications = await payload.find({ collection: 'publications', overrideAccess: true, depth: 0, limit: 1, where: { and: [
      { channel: { equals: body.channel } }, { kind: { equals: body.kind } }, { slug: { equals: body.slug } }, { withdrawn: { equals: false } },
    ] } });
    const publication: any = publications.docs[0];
    if (!publication) return json({ error: 'content_unavailable' }, 404);
    if (publication.release !== body.releaseID) return json({ error: 'content_changed' }, 409);
    try {
      await payload.create({ collection: 'feedback', overrideAccess: true, context: { internalFeedback: true }, data: {
        receiptHash, publication: publication.id, release: publication.release,
        contentTitle: publication.title, kind: body.kind, slug: body.slug, channel: body.channel,
        category: body.category, message, status: 'new',
      } });
    } catch (error) {
      // Concurrent duplicate submissions must not become two tickets or expose a DB error.
      const duplicate: any = await findReceipt();
      if (duplicate && duplicate.release === body.releaseID && duplicate.category === body.category && duplicate.message === message) return json({ received: true });
      throw error;
    }
    return json({ received: true }, 201);
  } catch {
    // Do not log request bodies, receipt codes, connection strings or medical text.
    console.error('feedback_api_failed');
    return json({ error: 'service_unavailable' }, 503);
  }
}
