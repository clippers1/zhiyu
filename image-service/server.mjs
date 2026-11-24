import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ADMIN_HTML } from "./admin.mjs";

// A small, dependency-free HTTP wrapper around an OpenAI-compatible
// /v1/images/generations endpoint. It exists because the model takes 15–60
// seconds per image: the call needs a timeout, a concurrency ceiling and a
// queue, and the key must never reach a browser. The service binds to
// loopback only and authenticates every call with a bearer token.

const MAX_BODY_BYTES = 64 * 1024;
const MAX_PROMPT = 4000;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".webp"]);
const RETRY_DELAYS = [2000, 6000];

const json = (body, status = 200, extra = {}) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra },
  });

// `handle` is used both by the HTTP server (headers is a plain object) and by
// tests that pass a web Request (headers is a Headers instance). Read through
// one accessor so authentication behaves the same in both.
const header = (request, name) =>
  typeof request.headers?.get === "function" ? request.headers.get(name) : request.headers?.[name];

// Compare digests instead of raw strings so neither length nor prefix leaks.
const digest = value => createHash("sha256").update(String(value)).digest();

// Accepts both an http.IncomingMessage (streams) and a web Request (async
// iterable), so the same handler serves the real server and the tests.
async function readBody(request, limit = MAX_BODY_BYTES) {
  const declared = Number(header(request, "content-length"));
  if (Number.isFinite(declared) && declared > limit) throw Object.assign(new Error("too_large"), { status: 413 });
  // A web Request (used by the tests) exposes arrayBuffer(); an
  // http.IncomingMessage is a stream with .on().
  if (typeof request.arrayBuffer === "function" && !request.on) {
    const buffer = Buffer.from(await request.arrayBuffer());
    if (buffer.length > limit) throw Object.assign(new Error("too_large"), { status: 413 });
    return buffer;
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    request.on("data", chunk => {
      bytes += chunk.length;
      if (bytes > limit) {
        reject(Object.assign(new Error("too_large"), { status: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

async function readJSON(request) {
  const type = String(header(request, "content-type") || "").split(";")[0].trim();
  if (type !== "application/json") throw Object.assign(new Error("json_required"), { status: 415 });
  const raw = await readBody(request);
  try {
    const body = JSON.parse(raw.toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid");
    return body;
  } catch {
    throw Object.assign(new Error("invalid_json"), { status: 400 });
  }
}

// PNG / JPEG / WebP headers are enough to report the real pixel size: the
// upstream may snap a requested size to its own tier, so the request value
// must never be reported as the result.
export function imageSize(buffer) {
  if (buffer.length > 24 && buffer.readUInt32BE(0) === 0x89504e47 && buffer.toString("ascii", 12, 16) === "IHDR") {
    return { format: "png", width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length > 8 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 <= buffer.length) {
      if (buffer[offset] !== 0xff) { offset++; continue; }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isFrame) return { format: "jpg", width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      offset += 2 + length;
    }
  }
  if (buffer.length >= 30 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buffer.toString("ascii", 12, 16);
    if (chunk === "VP8X") return { format: "webp", width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
    if (chunk === "VP8 ") return { format: "webp", width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L") {
      const bits = buffer.readUInt32LE(21);
      return { format: "webp", width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  return { format: null, width: null, height: null };
}

function timestamp(date) {
  const pad = value => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

const dayKey = date => date.toISOString().slice(0, 10);

function limiter(max, maxQueue) {
  let active = 0;
  const waiting = [];
  return {
    get active() { return active; },
    get waiting() { return waiting.length; },
    async acquire() {
      if (active < max) {
        active++;
        return () => { active--; waiting.shift()?.(); };
      }
      if (waiting.length >= maxQueue) return null;
      await new Promise(resolve => waiting.push(resolve));
      active++;
      return () => { active--; waiting.shift()?.(); };
    },
  };
}

// Lists generated images newest-first straight from disk: the sidecar is the
// source of truth, so a file copied in or deleted by hand is reflected without
// a database. Files without a sidecar are still listed with their stat info.
async function listImages(outputDir, { limit = 24, before = null } = {}) {
  const names = (await readdir(outputDir)).filter(name => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()));
  const entries = [];
  for (const name of names) {
    let meta = null;
    try { meta = JSON.parse(await readFile(path.join(outputDir, `${name}.json`), "utf8")); } catch { /* sidecar optional */ }
    let info;
    try { info = await stat(path.join(outputDir, name)); } catch { continue; }
    const createdAt = meta?.createdAt || info.mtime.toISOString();
    entries.push({ name, meta, info, createdAt, key: createdAt + "\u0000" + name });
  }
  // Newest first. The timestamp alone is not enough: two images in the same
  // second share it, so the file name (which carries a random suffix) breaks
  // the tie deterministically.
  entries.sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
  const start = before ? entries.findIndex(entry => entry.name === before) : -1;
  const offset = start >= 0 ? start + 1 : 0;
  const slice = entries.slice(offset, offset + limit + 1);
  const items = slice.slice(0, limit).map(({ name, meta, info, createdAt }) => ({
    file: name,
    url: `/files/${encodeURIComponent(name)}`,
    id: meta?.id || name.replace(/\.[a-z]+$/i, ""),
    prompt: meta?.prompt || "",
    width: meta?.width || null,
    height: meta?.height || null,
    bytes: meta?.bytes || info.size,
    usage: meta?.usage || null,
    reference: meta?.reference || null,
    createdAt,
  }));
  const more = slice.length > limit;
  return { items, nextCursor: more ? items[items.length - 1].file : null, total: entries.length };
}

// The service may be reachable through a reverse proxy for external agents.
// IMAGE_PUBLIC_ORIGIN is the origin those agents will see, so absolute image
// URLs in responses actually open. Locally it stays empty and URLs are relative.
function publicOriginOf(configured) {
  return String(configured || "").replace(/\/+$/, "");
}

export function createImageService(options = {}) {
  const {
    fetchImpl = fetch,
    outputDir,
    token,
    apiBase,
    apiKey,
    model = process.env.IMAGE_MODEL || "gpt-image-2.6",
    maxConcurrency = Number(process.env.IMAGE_MAX_CONCURRENCY || 2),
    maxQueue = Number(process.env.IMAGE_MAX_QUEUE || 8),
    timeoutMs = Number(process.env.IMAGE_TIMEOUT_MS || 300000),
    dailyLimit = Number(process.env.IMAGE_DAILY_LIMIT || 200),
    publicOrigin = process.env.IMAGE_PUBLIC_ORIGIN || "",
    allowBrowser = process.env.IMAGE_ALLOW_BROWSER === "true",
    now = () => new Date(),
    logger = () => {},
    sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  } = options;

  if (!outputDir) throw new Error("outputDir is required");
  if (!token) throw new Error("IMAGE_SERVICE_TOKEN is required");
  const gate = limiter(maxConcurrency, maxQueue);
  let latest = null;
  const lastGeneratedAt = () => latest;

  const origin = publicOriginOf(publicOrigin && /^https?:\/\//.test(publicOrigin) ? publicOrigin : "");
  const absolute = urlPath => (origin ? `${origin}${urlPath}` : urlPath);
  // A browser calling from another origin needs CORS; it is off by default so a
  // misconfigured deployment cannot be driven by any page on the internet.
  const corsHeaders = request => {
    if (!allowBrowser || !origin || header(request, "origin") !== origin) return {};
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    };
  };
  // OpenAI-compatible clients expect `created` + `data[].b64_json|url`; our own
  // CLI reads `images`. Returning both keeps one response usable by both.
  // `response_format: "b64_json"` is what many OpenAI clients default to; it is
  // honoured by reading the stored file back, so the caller does not depend on
  // a second request (or on reaching /files from the same network).
  const publicResult = async (result, responseFormat) => {
    const base = {
      created: Math.floor(now().getTime() / 1000),
      model: result.model,
      images: result.images.map(item => ({ ...item, url: absolute(item.url) })),
      usage: result.usage,
      requested: result.requested,
    };
    if (responseFormat === "b64_json") {
      return {
        ...base,
        data: await Promise.all(result.images.map(async item => ({
          b64_json: (await readFile(path.join(outputDir, item.file))).toString("base64"),
          revised_prompt: item.prompt,
        }))),
      };
    }
    return { ...base, data: result.images.map(item => ({ url: absolute(item.url), revised_prompt: item.prompt })) };
  };
  async function quotaPreview() {
    const current = await loadUsage();
    const used = current.day === dayKey(now()) ? current.count : 0;
    return { allowed: used < dailyLimit, used, day: current.day };
  }
  const tokenDigest = digest(token);
  const usageFile = path.join(outputDir, ".usage.json");
  let usage = null;
  let usageChain = Promise.resolve();

  async function loadUsage() {
    if (usage) return usage;
    try {
      const parsed = JSON.parse(await readFile(usageFile, "utf8"));
      usage = { day: parsed.day, count: Number(parsed.count) || 0, images: Number(parsed.images) || 0, bytes: Number(parsed.bytes) || 0 };
    } catch {
      usage = { day: dayKey(now()), count: 0, images: 0, bytes: 0 };
    }
    return usage;
  }

  function recordUsage(entry) {
    usageChain = usageChain.then(async () => {
      const current = await loadUsage();
      const today = dayKey(now());
      if (current.day !== today) Object.assign(current, { day: today, count: 0, images: 0, bytes: 0 });
      current.count += 1;
      current.images += entry.images;
      current.bytes += entry.bytes;
      await writeFile(usageFile, JSON.stringify(current, null, 2));
    }).catch(error => logger({ event: "usage_write_failed", message: error.message }));
    return usageChain;
  }

  function authorized(request) {
    const authHeader = String(header(request, "authorization") || "");
    const match = /^Bearer (.+)$/.exec(authHeader);
    if (!match) return false;
    return digest(match[1]).equals(tokenDigest);
  }

  async function callUpstream(body, referenceFile) {
    const base = String(apiBase || "").replace(/\/+$/, "");
    let response;
    if (referenceFile) {
      const reference = await readFile(path.join(outputDir, referenceFile));
      const form = new FormData();
      form.set("model", model);
      form.set("prompt", body.prompt);
      if (body.size) form.set("size", body.size);
      form.set("n", String(body.count));
      form.set("image", new Blob([reference], { type: "image/png" }), referenceFile);
      response = await fetchImpl(`${base}/images/edits`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } else {
      response = await fetchImpl(`${base}/images/generations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: body.prompt,
          n: body.count,
          ...(body.size ? { size: body.size } : {}),
          ...(body.quality ? { quality: body.quality } : {}),
          ...(body.background ? { background: body.background } : {}),
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    }
    return response;
  }

  async function generate(body, referenceFile) {
    const requested = {
      size: body.size || null,
      quality: body.quality || null,
      background: body.background || null,
      count: body.count,
    };
    const createdAt = now();
    for (let attempt = 0; ; attempt++) {
      let response;
      try {
        response = await callUpstream(body, referenceFile);
      } catch (error) {
        if (error.name === "TimeoutError" || error.name === "AbortError") {
          throw Object.assign(new Error("upstream_timeout"), { status: 504 });
        }
        throw Object.assign(new Error("upstream_unreachable"), { status: 502 });
      }
      if (response.status === 429 || response.status >= 500) {
        if (attempt < RETRY_DELAYS.length) {
          await sleep(RETRY_DELAYS[attempt]);
          continue;
        }
        throw Object.assign(new Error("upstream_failed"), { status: 502, upstreamStatus: response.status });
      }
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        throw Object.assign(new Error("upstream_rejected"), { status: 502, detail, upstreamStatus: response.status });
      }
      const payload = await response.json();
      const items = Array.isArray(payload.data) ? payload.data : [];
      if (!items.length) throw Object.assign(new Error("upstream_empty"), { status: 502 });

      const stamp = timestamp(createdAt);
      const written = [];
      // Never echo the upstream payload back: it carries every image as base64
      // and would double the response size. Only the parameters are reported.
      const returned = {
        size: payload.size || null,
        quality: payload.quality || null,
        output_format: payload.output_format || null,
        background: payload.background || null,
      };
      for (const item of items) {
        // Some gateways return a URL instead of base64; both are supported so
        // the service works with either dialect.
        let buffer;
        if (typeof item.b64_json === "string") buffer = Buffer.from(item.b64_json, "base64");
        else if (typeof item.url === "string") buffer = Buffer.from(await (await fetchImpl(item.url)).arrayBuffer());
        else continue;
        if (!buffer.length) continue;
        const { format, width, height } = imageSize(buffer);
        if (!format) throw Object.assign(new Error("unsupported_image_format"), { status: 502 });
        const id = `${stamp}-${randomBytes(4).toString("hex")}`;
        const file = `${id}.${format}`;
        const target = path.join(outputDir, file);
        const temporary = `${target}.tmp`;
        await writeFile(temporary, buffer);
        await rename(temporary, target);
        const record = {
          id,
          file,
          prompt: body.prompt,
          model,
          requested,
          returned,
          width,
          height,
          bytes: buffer.length,
          sha256: createHash("sha256").update(buffer).digest("hex"),
          usage: payload.usage || null,
          reference: referenceFile || null,
          createdAt: createdAt.toISOString(),
        };
        await writeFile(`${target}.json`, JSON.stringify(record, null, 2));
        written.push({ file, url: `/files/${file}`, prompt: body.prompt, width, height, bytes: record.bytes, sha256: record.sha256, usage: payload.usage || null });
      }
      if (!written.length) throw Object.assign(new Error("upstream_empty"), { status: 502 });
      const images = written.length;
      const bytes = written.reduce((sum, item) => sum + item.bytes, 0);
      latest = createdAt.toISOString();
      await recordUsage({ images, bytes });
      return { model, images: written, usage: payload.usage || null, requested, returned };
    }
  }

  async function handle(request) {
    const url = new URL(request.url, "http://localhost");
    const route = url.pathname;

    if (route === "/healthz") {
      if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { Allow: "GET" });
      const current = await loadUsage();
      const last = lastGeneratedAt();
      return json({ status: "ok", service: "zhiyu-image", model, configured: Boolean(apiBase && apiKey), outputDir,
        active: gate.active, queue: gate.waiting, usageToday: current.day === dayKey(now()) ? current.count : 0,
        ...(last ? { lastGeneratedAt: last } : {}) });
    }

    if (route.startsWith("/files/")) {
      if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { Allow: "GET" });
      let name;
      try {
        name = decodeURIComponent(route.slice("/files/".length));
      } catch {
        return json({ error: "not_found" }, 404);
      }
      // Only bare image filenames inside the output directory are servable.
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) || name.includes("..") || !IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase())) {
        return json({ error: "not_found" }, 404);
      }
      try {
        const info = await stat(path.join(outputDir, name));
        if (!info.isFile()) return json({ error: "not_found" }, 404);
        const bytes = await readFile(path.join(outputDir, name));
        const type = name.endsWith(".png") ? "image/png" : name.endsWith(".webp") ? "image/webp" : "image/jpeg";
        return new Response(bytes, { headers: { "Content-Type": type, "Cache-Control": "no-store", "Content-Length": String(bytes.length) } });
      } catch {
        return json({ error: "not_found" }, 404);
      }
    }

    if (route === "/favicon.ico") {
      // Inline empty icon: the page sets no favicon, and a 404 in the console
      // makes a healthy service look broken.
      return new Response(Buffer.alloc(0), { status: 204 });
    }

    if (route === "/" || route === "/admin") {
      if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { Allow: "GET" });
      return new Response(ADMIN_HTML, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; base-uri 'none'" } });
    }

    if (route === "/api/state") {
      if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { Allow: "GET" });
      if (!authorized(request)) return json({ error: "unauthorized" }, 401);
      const current = await loadUsage();
      const names = (await readdir(outputDir)).filter(name => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()));
      // After a restart the in-memory timestamp is empty; fall back to the
      // newest sidecar so the page still shows when the last image was made.
      let last = lastGeneratedAt();
      if (!last) {
        const newest = names.slice().sort().reverse().find(name => name.endsWith(".png"));
        if (newest) {
          try { last = JSON.parse(await readFile(path.join(outputDir, `${newest}.json`), "utf8")).createdAt || null; } catch { /* optional */ }
        }
      }
      return json({
        health: { status: "ok", model, configured: Boolean(apiBase && apiKey), outputDir,
          active: gate.active, queue: gate.waiting, ...(last ? { lastGeneratedAt: last } : {}) },
        usage: { ...current, limit: dailyLimit, day: current.day === dayKey(now()) ? current.day : dayKey(now()) },
        stored: names.length,
      });
    }

    if (route === "/api/images") {
      if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { Allow: "GET" });
      if (!authorized(request)) return json({ error: "unauthorized" }, 401);
      const params = url.searchParams;
      const rawLimit = params.get("limit") || "24";
      if (!/^\d+$/.test(rawLimit)) return json({ error: "invalid_limit" }, 400);
      const limit = Math.min(100, Math.max(1, Number(rawLimit)));
      const before = params.get("before");
      if (before !== null && !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(before)) return json({ error: "invalid_cursor" }, 400);
      const page = await listImages(outputDir, { limit, before });
      return json({ ...page, items: page.items.map(item => ({ ...item, url: absolute(item.url) })) });
    }

    if (route === "/usage") {
      if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { Allow: "GET" });
      if (!authorized(request)) return json({ error: "unauthorized" }, 401);
      const current = await loadUsage();
      return json({ ...current, limit: dailyLimit, publicOrigin: origin || null, browserCors: Boolean(allowBrowser && origin) });
    }

    // Two spellings of the same operation: the compact one our CLI uses, and
    // the OpenAI-standard path other agents and SDKs already know.
    if (route !== "/v1/images" && route !== "/v1/images/generations") return json({ error: "not_found" }, 404);
    if (request.method === "OPTIONS" && allowBrowser) {
      return new Response(null, { status: 204, headers: { ...corsHeaders(request), "Access-Control-Max-Age": "600" } });
    }
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { Allow: "POST" });
    if (!authorized(request)) return json({ error: "unauthorized" }, 401);
    if (!apiBase || !apiKey) return json({ error: "not_configured" }, 503);
    {
      const quote = await quotaPreview();
      if (!quote.allowed) return json({ error: "daily_limit_reached", limit: dailyLimit }, 429);
    }

    let body;
    try {
      body = await readJSON(request);
    } catch (error) {
      return json({ error: error.message }, error.status || 400);
    }
    if (typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > MAX_PROMPT) {
      return json({ error: "invalid_prompt" }, 400);
    }
    const count = body.count === undefined ? Number(body.n ?? 1) : Number(body.count);
    if (body.response_format !== undefined && !["url", "b64_json"].includes(body.response_format)) return json({ error: "invalid_response_format" }, 400);
    if (!Number.isInteger(count) || count < 1 || count > 4) return json({ error: "invalid_count" }, 400);
    if (body.size !== undefined && !/^\d{3,4}x\d{3,4}$/.test(String(body.size))) return json({ error: "invalid_size" }, 400);
    if (body.quality !== undefined && !["low", "medium", "high", "auto"].includes(body.quality)) return json({ error: "invalid_quality" }, 400);
    if (body.background !== undefined && !["opaque", "transparent", "auto"].includes(body.background)) return json({ error: "invalid_background" }, 400);
    let reference = null;
    if (body.reference !== undefined) {
      if (typeof body.reference !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(body.reference) || body.reference.includes("..")) {
        return json({ error: "invalid_reference" }, 400);
      }
      try {
        await stat(path.join(outputDir, body.reference));
        reference = body.reference;
      } catch {
        return json({ error: "reference_not_found" }, 404);
      }
    }

    const current = await loadUsage();
    const usedToday = current.day === dayKey(now()) ? current.count : 0;
    if (usedToday >= dailyLimit) return json({ error: "daily_limit_reached", limit: dailyLimit }, 429);

    const release = await gate.acquire();
    if (!release) return json({ error: "busy", queue: gate.waiting }, 429, { "Retry-After": "30" });

    const started = Date.now();
    try {
      const result = await generate({ ...body, count }, reference);
      logger({ event: "generated", images: result.images.length, ms: Date.now() - started,
        bytes: result.images.reduce((sum, item) => sum + item.bytes, 0) });
      const responseFormat = body.response_format === "b64_json" ? "b64_json" : "url";
      return json(await publicResult(result, responseFormat), 200, corsHeaders(request));
    } catch (error) {
      logger({ event: "generation_failed", error: error.message, ms: Date.now() - started });
      return json({ error: error.message, ...(error.detail ? { detail: error.detail } : {}),
        ...(error.upstreamStatus ? { upstreamStatus: error.upstreamStatus } : {}) }, error.status || 500, corsHeaders(request));
    } finally {
      release();
    }
  }

  const server = createServer((request, response) => {
    handle(request).then(result => {
      response.writeHead(result.status, Object.fromEntries(result.headers));
      return result.arrayBuffer().then(body => response.end(Buffer.from(body)));
    }).catch(error => {
      logger({ event: "unhandled", error: error.message });
      const fallback = json({ error: "internal_error" }, 500);
      response.writeHead(500, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ error: "internal_error" }));
    });
  });

  return { server, handle, generate, loadUsage, usageFile, listImages: opts => listImages(outputDir, opts) };
}

async function start() {
  const outputDir = process.env.IMAGE_OUTPUT_DIR || path.resolve("artifacts/imagegen");
  const token = process.env.IMAGE_SERVICE_TOKEN;
  if (!token) {
    console.error("IMAGE_SERVICE_TOKEN is required; refusing to start without authentication.");
    process.exit(1);
  }
  const port = Number(process.env.IMAGE_PORT || 3120);
  // Fail at boot, not on the first (paid) request: prove the output directory
  // is writable and say exactly why when it is not.
  await mkdir(outputDir, { recursive: true });
  const probe = path.join(outputDir, ".probe");
  try {
    await writeFile(probe, "");
    await stat(probe);
  } catch (error) {
    console.error(`Cannot write to IMAGE_OUTPUT_DIR=${outputDir}: ${error.message}`);
    process.exit(1);
  }
  const service = createImageService({
    outputDir,
    token,
    apiBase: process.env.IMAGE_API_BASE,
    apiKey: process.env.IMAGE_API_KEY,
    logger: event => console.log(JSON.stringify({ at: new Date().toISOString(), ...event })),
  });
  service.server.listen(port, "0.0.0.0", () => {
    console.log(JSON.stringify({ event: "listening", port, outputDir,
      model: process.env.IMAGE_MODEL || "gpt-image-2.6",
      configured: Boolean(process.env.IMAGE_API_BASE && process.env.IMAGE_API_KEY) }));
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  start().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
