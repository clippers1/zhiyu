import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const promptsPath = path.join(root, "scripts/media-prompts.json");
const rawDir = path.join(root, "artifacts/imagegen");
const manifestPath = path.join(root, "docs/media-manifest.json");

async function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = await readFile(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function loadSharp() {
  for (const pkg of [path.join(root, "package.json"), path.join(root, "backend/package.json")]) {
    try {
      const req = createRequire(pkg);
      return req("sharp");
    } catch {
      // try next package root
    }
  }
  throw new Error("sharp not found in root or backend node_modules; run npm ci first.");
}

async function fetchImageBytes(item, baseUrl, token) {
  if (typeof item.b64_json === "string") {
    return Buffer.from(item.b64_json, "base64");
  }
  if (typeof item.url === "string") {
    const targetUrl = item.url.startsWith("http") ? item.url : new URL(item.url, baseUrl).href;
    const response = await fetch(targetUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw new Error(`Failed to download generated image (${response.status}): ${targetUrl}`);
    return Buffer.from(await response.arrayBuffer());
  }
  throw new Error("Image response item contains neither b64_json nor url");
}

async function loadManifest() {
  if (!existsSync(manifestPath)) return { schemaVersion: 1, model: "gpt-image-2.6", items: {} };
  return JSON.parse(await readFile(manifestPath, "utf8"));
}

async function saveManifest(manifest) {
  const sorted = Object.fromEntries(
    Object.entries(manifest.items).sort(([a], [b]) => a.localeCompare(b)),
  );
  await writeFile(manifestPath, `${JSON.stringify({ ...manifest, items: sorted }, null, 2)}\n`);
}

async function main() {
  await loadEnvFile(path.join(root, ".env"));
  const spec = JSON.parse(await readFile(promptsPath, "utf8"));
  const args = process.argv.slice(2);
  const onlyAnchors = args.includes("--anchors");
  const all = args.includes("--all");
  const force = args.includes("--force");
  const importOnly = args.includes("--import-only");
  const requested = args.filter(arg => !arg.startsWith("--"));

  let selected = spec.items;
  if (requested.length) {
    selected = spec.items.filter(item => requested.includes(item.id));
    const missing = requested.filter(id => !selected.some(item => item.id === id));
    if (missing.length) throw new Error(`Unknown media ids: ${missing.join(", ")}`);
  } else if (onlyAnchors) {
    selected = spec.items.filter(item => item.anchor);
  } else if (!all && !importOnly) {
    console.error("Usage: node scripts/generate-media.mjs [--anchors | --all | <id...>] [--force] [--import-only]");
    process.exit(2);
  }

  const token = process.env.IMAGE_SERVICE_TOKEN || "";
  const endpoint = process.env.IMAGE_GEN_URL
    || (process.env.IMAGE_PUBLIC_ORIGIN ? `${process.env.IMAGE_PUBLIC_ORIGIN.replace(/\/+$/, "")}/v1/images/generations` : "https://imggpt.anron.fun/v1/images/generations");
  if (!importOnly && !token) throw new Error("IMAGE_SERVICE_TOKEN is required (set in .env or environment).");

  const sharp = await loadSharp();
  await mkdir(rawDir, { recursive: true });
  await mkdir(path.join(root, "public/media"), { recursive: true });
  const manifest = await loadManifest();

  const concurrencyArg = args.find(arg => arg.startsWith("--concurrency="));
  const concurrency = Math.max(1, Math.min(3, Number(concurrencyArg?.split("=")[1] || 2)));
  let manifestLock = Promise.resolve();

  async function processItem(item) {
    const rawFile = path.join(rawDir, `${item.id}.png`);
    const metaFile = path.join(rawDir, `${item.id}.meta.json`);
    const targetFile = path.join(root, item.target);
    const fullPrompt = `${item.prompt}\n\nStyle guide: ${item.kind === "organ" ? spec.organStyleBible : spec.styleBible}`;

    if (!importOnly && (force || !existsSync(rawFile))) {
      console.log(`[gen] ${item.id} -> ${endpoint}`);
      const payload = {
        prompt: fullPrompt,
        n: 1,
        size: item.size || "1024x1024",
        ...(item.background ? { background: item.background } : {}),
      };
      let response;
      let lastError;
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(300_000),
          });
          lastError = null;
          if (response.ok || (response.status < 500 && response.status !== 429)) break;
        } catch (error) {
          lastError = error;
        }
        if (attempt < 4) {
          console.log(`[retry] ${item.id} attempt ${attempt + 1} (${lastError?.message || response?.status})`);
          await new Promise(resolve => setTimeout(resolve, attempt * 4000));
        }
      }
      if (lastError) throw new Error(`${item.id}: ${lastError.message}`);
      if (!response.ok) {
        const errText = (await response.text()).slice(0, 400);
        throw new Error(`${item.id}: image endpoint returned ${response.status}: ${errText}`);
      }
      const data = await response.json();
      const first = data.data?.[0] || data.images?.[0];
      if (!first) throw new Error(`${item.id}: empty image response`);
      const bytes = await fetchImageBytes(first, endpoint, token);
      const rawMeta = await sharp(bytes).metadata();
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      await writeFile(rawFile, bytes);
      await writeFile(metaFile, `${JSON.stringify({
        id: item.id,
        model: data.model || spec.model,
        endpoint,
        prompt: fullPrompt,
        requestedSize: payload.size,
        background: payload.background || null,
        rawWidth: rawMeta.width,
        rawHeight: rawMeta.height,
        rawFormat: rawMeta.format,
        rawBytes: bytes.length,
        rawSha256: sha256,
        usage: data.usage || null,
        generatedAt: new Date().toISOString(),
      }, null, 2)}\n`);
      console.log(`[raw] ${item.id}: ${rawMeta.width}x${rawMeta.height} (${(bytes.length / 1024).toFixed(1)} KB)`);
    } else if (!existsSync(rawFile)) {
      throw new Error(`${item.id}: raw file missing at ${rawFile}`);
    }

    const rawBytes = await readFile(rawFile);
    let rawMetaRecord = {};
    if (existsSync(metaFile)) rawMetaRecord = JSON.parse(await readFile(metaFile, "utf8"));

    let pipeline = sharp(rawBytes);
    const meta = await pipeline.metadata();
    const maxW = item.maxWidth || 960;
    if (meta.width && meta.width > maxW) {
      pipeline = pipeline.resize({ width: maxW, withoutEnlargement: true });
    }
    const webpBuffer = await pipeline.webp({ quality: 86, alphaQuality: 92, effort: 5 }).toBuffer();
    const outMeta = await sharp(webpBuffer).metadata();
    const webpSha256 = createHash("sha256").update(webpBuffer).digest("hex");
    await writeFile(targetFile, webpBuffer);

    manifestLock = manifestLock.then(async () => {
      manifest.items[item.id] = {
        id: item.id,
        kind: item.kind,
        src: `/${path.relative(path.join(root, "public"), targetFile).replaceAll(path.sep, "/")}`,
        model: rawMetaRecord.model || spec.model,
        width: outMeta.width,
        height: outMeta.height,
        bytes: webpBuffer.length,
        sha256: webpSha256,
        rawSha256: rawMetaRecord.rawSha256 || createHash("sha256").update(rawBytes).digest("hex"),
        background: item.background || "opaque",
        prompt: item.prompt,
        generatedAt: rawMetaRecord.generatedAt || new Date().toISOString(),
      };
      await saveManifest(manifest);
    });
    await manifestLock;
    console.log(`[webp] ${item.id} -> ${item.target} (${outMeta.width}x${outMeta.height}, ${(webpBuffer.length / 1024).toFixed(1)} KB)`);
  }

  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, selected.length) }, async () => {
    while (cursor < selected.length) {
      const current = selected[cursor++];
      await processItem(current);
    }
  });
  await Promise.all(workers);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
