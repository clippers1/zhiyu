import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { createImageService, imageSize } from "../image-service/server.mjs";

const TOKEN = "test-token-not-a-runtime-secret";

// A minimal PNG header is enough for the service's size reader: signature,
// IHDR length/type and the width/height fields.
function png(width = 1122, height = 1402) {
  const buffer = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer[24] = 8; buffer[25] = 6;
  return buffer;
}

const upstreamOk = (body = { data: [{ b64_json: png().toString("base64") }], size: "1122x1402", quality: "medium", output_format: "png",
  usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 } }) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

async function setup(overrides = {}) {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "zhiyu-image-"));
  const service = createImageService({
    outputDir,
    token: TOKEN,
    apiBase: "https://example.invalid/v1",
    apiKey: "upstream-key",
    sleep: async () => {},
    ...overrides,
  });
  return { service, outputDir };
}

const post = (body, token = TOKEN) =>
  new Request("http://localhost/v1/images", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

test("the service refuses to start without a token or output directory", async () => {
  // These throw synchronously, at construction: a misconfigured service must
  // never reach the listening state.
  assert.throws(() => createImageService({ token: TOKEN, outputDir: "" }), /outputDir/);
  assert.throws(() => createImageService({ outputDir: "/tmp/x" }), /IMAGE_SERVICE_TOKEN/);
});

test("auth, content type, size limits and routing fail closed", async () => {
  const { service, outputDir } = await setup({ fetchImpl: async () => upstreamOk() });
  assert.equal((await service.handle(post({ prompt: "x" }, ""))).status, 401);
  assert.equal((await service.handle(post({ prompt: "x" }, "wrong"))).status, 401);

  const wrongType = new Request("http://localhost/v1/images", { method: "POST", headers: { Authorization: `Bearer ${TOKEN}` }, body: "prompt=x" });
  assert.equal((await service.handle(wrongType)).status, 415);

  // No Content-Length header here: fetch treats it as a forbidden request
  // header, and the service counts bytes while reading anyway.
  const big = new Request("http://localhost/v1/images", {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "x".repeat(200_000) }),
  });
  assert.equal((await service.handle(big)).status, 413);

  assert.equal((await service.handle(new Request("http://localhost/nope"))).status, 404);
  assert.equal((await service.handle(new Request("http://localhost/v1/images", { method: "GET" }))).status, 405);
  assert.equal((await service.handle(post({ prompt: "" }))).status, 400);
  assert.equal((await service.handle(post({ prompt: "ok", count: 9 }))).status, 400);
  assert.equal((await service.handle(post({ prompt: "ok", size: "<script>" }))).status, 400);
  assert.deepEqual(await readdir(outputDir), [], "rejected calls must not write files");
});

test("a generated image is written with a sidecar carrying the real size and usage", async () => {
  const { service, outputDir } = await setup({ fetchImpl: async () => upstreamOk() });
  const response = await service.handle(post({ prompt: "一张暖白纸面上的化验单静物", size: "1024x1280", quality: "high" }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.model, "gpt-image-2.6");
  assert.equal(body.images.length, 1);
  const [image] = body.images;
  assert.equal(image.width, 1122);
  assert.equal(image.height, 1402);
  assert.equal(body.requested.size, "1024x1280");
  assert.deepEqual(body.usage, { input_tokens: 10, output_tokens: 20, total_tokens: 30 });

  const files = await readdir(outputDir);
  assert.ok(files.includes(image.file), "image file written");
  assert.ok(files.includes(`${image.file}.json`), "sidecar written");
  const bytes = await readFile(path.join(outputDir, image.file));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), image.sha256);
  const record = JSON.parse(await readFile(path.join(outputDir, `${image.file}.json`), "utf8"));
  assert.equal(record.prompt, "一张暖白纸面上的化验单静物");
  assert.equal(record.returned.size, "1122x1402");
  assert.equal(record.width, 1122);

  const usage = await service.handle(new Request("http://localhost/usage", { headers: { Authorization: `Bearer ${TOKEN}` } }));
  assert.equal((await usage.json()).count, 1);
});

test("a reference image switches to the edits endpoint", async () => {
  const calls = [];
  const { service, outputDir } = await setup({
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return upstreamOk();
    },
  });
  await writeFile(path.join(outputDir, "seed.png"), png());
  const response = await service.handle(post({ prompt: "改成青灰配色", reference: "seed.png" }));
  assert.equal(response.status, 200);
  assert.match(calls[0].url, /\/images\/edits$/);
  assert.ok(calls[0].init.body instanceof FormData);
  assert.equal(calls[0].init.body.get("prompt"), "改成青灰配色");
  assert.ok(calls[0].init.body.get("image"));
  const record = JSON.parse(await readFile(path.join(outputDir, `${(await response.json()).images[0].file}.json`), "utf8"));
  assert.equal(record.reference, "seed.png");
});

test("upstream 4xx is not retried; 5xx is retried and then reported without writing", async () => {
  let calls = 0;
  const rejected = await setup({ fetchImpl: async () => { calls++; return new Response("bad request", { status: 400 }); } });
  const first = await rejected.service.handle(post({ prompt: "x" }));
  assert.equal(first.status, 502);
  assert.equal(calls, 1, "4xx must not be retried");

  calls = 0;
  const failing = await setup({ fetchImpl: async () => { calls++; return new Response("boom", { status: 503 }); } });
  const second = await failing.service.handle(post({ prompt: "x" }));
  assert.equal(second.status, 502);
  assert.equal(calls, 3, "two retries after the first attempt");
  assert.equal((await readdir(failing.outputDir)).length, 0);
});

test("the concurrency ceiling returns 429 instead of queueing without bound", async () => {
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const { service } = await setup({
    maxConcurrency: 1,
    maxQueue: 0,
    fetchImpl: async () => { await blocked; return upstreamOk(); },
  });
  const first = service.handle(post({ prompt: "first" }));
  await new Promise(resolve => setImmediate(resolve));
  const second = await service.handle(post({ prompt: "second" }));
  assert.equal(second.status, 429);
  assert.equal(second.headers.get("Retry-After"), "30");
  release();
  assert.equal((await first).status, 200);
});

test("the daily limit closes the service before it spends tokens", async () => {
  const { service } = await setup({ dailyLimit: 1, fetchImpl: async () => upstreamOk() });
  assert.equal((await service.handle(post({ prompt: "one" }))).status, 200);
  const limited = await service.handle(post({ prompt: "two" }));
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).error, "daily_limit_reached");
});

test("file downloads are restricted to bare image names in the output directory", async () => {
  const { service, outputDir } = await setup();
  await writeFile(path.join(outputDir, "ok.png"), png());
  const ok = await service.handle(new Request("http://localhost/files/ok.png"));
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("content-type"), "image/png");
  for (const name of ["..%2Fetc%2Fpasswd", "nope.png", ".probe", "ok.json"]) {
    assert.equal((await service.handle(new Request(`http://localhost/files/${name}`))).status, 404, name);
  }
});

test("imageSize reads PNG, JPEG and WebP headers", () => {
  assert.deepEqual(imageSize(png(800, 600)), { format: "png", width: 800, height: 600 });
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0x58, 0x03, 0x20]);
  assert.deepEqual(imageSize(jpeg), { format: "jpg", width: 800, height: 600 });
  const webp = Buffer.alloc(30);
  webp.write("RIFF", 0, "ascii");
  webp.write("WEBP", 8, "ascii");
  webp.write("VP8X", 12, "ascii");
  webp.writeUIntLE(1199, 24, 3);
  webp.writeUIntLE(799, 27, 3);
  assert.deepEqual(imageSize(webp), { format: "webp", width: 1200, height: 800 });
  assert.deepEqual(imageSize(Buffer.from("not an image")), { format: null, width: null, height: null });
});

test("the admin page and its read endpoints are gated, and the gallery lists newest first", async () => {
  const { service, outputDir } = await setup({ fetchImpl: async () => upstreamOk() });
  await service.generate({ prompt: "第一张", count: 1 }, null);
  await new Promise(resolve => setTimeout(resolve, 5));
  await service.generate({ prompt: "第二张", count: 1 }, null);

  const page = await service.handle(new Request("http://localhost/"));
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /text\/html/);
  assert.match(await page.text(), /IMAGE_SERVICE_TOKEN/);

  assert.equal((await service.handle(new Request("http://localhost/api/state"))).status, 401);
  const state = await (await service.handle(new Request("http://localhost/api/state", { headers: { Authorization: `Bearer ${TOKEN}` } }))).json();
  assert.equal(state.stored, 2);
  assert.equal(state.usage.count, 2);
  assert.ok(state.health.lastGeneratedAt);

  const list = await (await service.handle(new Request("http://localhost/api/images?limit=1", { headers: { Authorization: `Bearer ${TOKEN}` } }))).json();
  assert.equal(list.items.length, 1);
  assert.equal(list.items[0].prompt, "第二张", "newest first");
  assert.ok(list.nextCursor);
  const older = await (await service.handle(new Request(`http://localhost/api/images?limit=1&before=${encodeURIComponent(list.nextCursor)}`, { headers: { Authorization: `Bearer ${TOKEN}` } }))).json();
  assert.equal(older.items[0].prompt, "第一张");
  assert.equal(older.nextCursor, null);

  const badLimit = await service.handle(new Request("http://localhost/api/images?limit=abc", { headers: { Authorization: `Bearer ${TOKEN}` } }));
  assert.equal(badLimit.status, 400);
  const badCursor = await service.handle(new Request("http://localhost/api/images?before=../x", { headers: { Authorization: `Bearer ${TOKEN}` } }));
  assert.equal(badCursor.status, 400);
  assert.deepEqual((await readdir(outputDir)).filter(name => name.startsWith("..")), []);
});

test("the OpenAI-standard path returns the same images in the standard shape and honours n", async () => {
  let upstreamPayload = null;
  const { service } = await setup({
    dailyLimit: 2,
    fetchImpl: async (_url, init) => {
      upstreamPayload = JSON.parse(init.body);
      return upstreamOk({
        data: [{ b64_json: png().toString("base64") }, { b64_json: png().toString("base64") }],
        size: "1024x1024",
        usage: { input_tokens: 10, output_tokens: 40, total_tokens: 50 },
      });
    },
  });
  const response = await service.handle(new Request("http://localhost/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ prompt: "兼容路径", n: 2 }),
  }));
  assert.equal(response.status, 200);
  assert.equal(upstreamPayload.n, 2, "OpenAI n must be forwarded to upstream");
  const body = await response.json();
  assert.ok(Number.isInteger(body.created));
  assert.equal(body.data.length, 2);
  assert.match(body.data[0].url, /^\/files\/.+\.(png|jpg|webp)$/);
  assert.equal(body.images.length, 2);
  assert.equal(body.model, "gpt-image-2.6");
  // Two images consumed the dailyLimit of 2 images.
  const limited = await service.handle(post({ prompt: "third" }));
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).error, "daily_limit_reached");
});

test("a public origin makes image URLs absolute, and browser CORS stays opt-in", async () => {
  const { service } = await setup({
    publicOrigin: "https://img.example.com",
    allowBrowser: true,
    fetchImpl: async () => upstreamOk(),
  });
  const preflight = await service.handle(new Request("http://localhost/v1/images/generations", {
    method: "OPTIONS",
    headers: { Origin: "https://img.example.com", "Access-Control-Request-Method": "POST" },
  }));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "https://img.example.com");

  const foreign = await service.handle(new Request("http://localhost/v1/images/generations", {
    method: "OPTIONS",
    headers: { Origin: "https://evil.example.com" },
  }));
  assert.equal(foreign.status, 204);
  assert.equal(foreign.headers.get("access-control-allow-origin"), null, "only the configured origin is allowed");

  const generated = await service.handle(new Request("http://localhost/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}`, Origin: "https://img.example.com" },
    body: JSON.stringify({ prompt: "跨域调用" }),
  }));
  const body = await generated.json();
  assert.match(body.images[0].url, /^https:\/\/img\.example\.com\/files\//);
  assert.equal(generated.headers.get("access-control-allow-origin"), "https://img.example.com");
});

test("browser CORS is off unless explicitly enabled", async () => {
  const { service } = await setup({ fetchImpl: async () => upstreamOk() });
  const preflight = await service.handle(new Request("http://localhost/v1/images/generations", {
    method: "OPTIONS",
    headers: { Origin: "https://img.example.com" },
  }));
  // Without opt-in there is no CORS response: the request is simply not a POST.
  assert.equal(preflight.status, 405);
  assert.equal(preflight.headers.get("access-control-allow-origin"), null);
});

test("accepts OpenAI's n and can answer with b64_json", async () => {
  const { service } = await setup({
    fetchImpl: async (_url, init) => {
      const n = Number(JSON.parse(init.body).n) || 1;
      return upstreamOk({ data: Array.from({ length: n }, () => ({ b64_json: png().toString("base64") })), size: "1122x1402", usage: { total_tokens: 10 } });
    },
  });
  const response = await service.handle(new Request("http://localhost/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ prompt: "n 别名", n: 2, response_format: "b64_json" }),
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.data.length, 2);
  assert.ok(body.data.every(item => typeof item.b64_json === "string" && item.b64_json.length > 10));
  assert.ok(body.data.every(item => item.url === undefined));
  assert.ok(body.images.every(item => item.url.endsWith(".png")));

  const bad = await service.handle(new Request("http://localhost/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ prompt: "x", response_format: "pdf" }),
  }));
  assert.equal(bad.status, 400);
});
