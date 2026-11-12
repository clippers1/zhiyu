import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Thin CLI over the internal image service. It never talks to the provider
// directly: the key stays in the service, and this script only needs the
// service token.
//
//   npm run image:gen -- "化验单平铺在暖白纸面上的静物插画"
//   npm run image:gen -- --size 1024x1280 --count 2 "手绘便签风的流程"
//   npm run image:gen -- --reference 20261103-120000-abcd1234.png "改成青灰配色"
//   npm run image:gen -- --prompt-file prompts/report.txt --json

const USAGE = `usage: npm run image:gen -- [options] "prompt"

options
  --prompt-file <path>   read the prompt from a file instead of the argument
  --size <WxH>           requested size; the service records the real one
  --count <1-4>          images per call (default 1)
  --quality <low|medium|high|auto>
  --background <opaque|transparent|auto>
  --reference <file>     regenerate from an image already in the output dir
  --url <origin>         service origin (default $IMAGE_SERVICE_URL or :3120)
  --json                 print the raw response
  --help                 show this message`;

function parse(argv) {
  const options = { count: 1, json: false, help: false };
  const words = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') options.json = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`${arg} needs a value`);
      options[key === 'prompt-file' ? 'promptFile' : key] = value;
      index += 1;
    } else words.push(arg);
  }
  if (!options.prompt && words.length) options.prompt = words.join(' ');
  return options;
}

export function parseArgs(argv) {
  return parse(argv);
}

function endpoint(options) {
  const base = (options.url || process.env.IMAGE_SERVICE_URL || 'http://127.0.0.1:3120').replace(/\/+$/, '');
  return `${base}/v1/images`;
}

export function buildRequest(options) {
  const body = { prompt: options.prompt, count: Number(options.count) || 1 };
  for (const key of ['size', 'quality', 'background', 'reference']) {
    if (options[key]) body[key] = options[key];
  }
  return body;
}

function describe(payload) {
  return (payload.images || []).map((item, index) => [
    `[${index + 1}] ${item.file}`,
    `    ${item.width}×${item.height} · ${(item.bytes / 1024).toFixed(0)} KB · sha256 ${item.sha256.slice(0, 16)}…`,
    `    usage ${JSON.stringify(payload.usage || {})}`,
  ].join('\n')).join('\n');
}

async function main(argv) {
  const options = parse(argv);
  if (options.help) { console.log(USAGE); return 0; }
  if (options.promptFile) {
    options.prompt = (await readFile(path.resolve(options.promptFile), 'utf8')).trim();
  }
  if (!options.prompt || !options.prompt.trim()) {
    console.error('A prompt is required. Run with --help for usage.');
    return 2;
  }
  const token = process.env.IMAGE_SERVICE_TOKEN;
  if (!token) {
    console.error('IMAGE_SERVICE_TOKEN is required (the same value the service was started with).');
    return 2;
  }
  const response = await fetch(endpoint(options), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequest(options)),
    // One image can take a minute; retrying a timeout would bill twice.
    signal: AbortSignal.timeout(Number(process.env.IMAGE_CLI_TIMEOUT_MS || 360000)),
  });
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
  if (!response.ok) {
    console.error(`image generation failed: ${response.status} ${payload.error || ''}${payload.detail ? ` — ${payload.detail}` : ''}`);
    if (payload.upstreamStatus) console.error(`upstream status: ${payload.upstreamStatus}`);
    return 1;
  }
  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return 0;
  }
  console.log(describe(payload));
  const base = (options.url || process.env.IMAGE_SERVICE_URL || 'http://127.0.0.1:3120').replace(/\/+$/, '');
  for (const item of payload.images || []) console.log(`    ${base}/files/${item.file}`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main(process.argv.slice(2)).then(code => process.exit(code)).catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
