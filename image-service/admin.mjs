// The admin page is a single self-contained HTML document. It holds no data of
// its own: the browser asks for the service token once, keeps it in
// sessionStorage, and fetches /api/* with it. Prompts are inserted with
// textContent, never innerHTML, so a generated prompt cannot inject markup.
export const ADMIN_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>图片生成 · 状态与产物</title>
<style>
  :root { color-scheme: light; --ink:#1c2420; --ink2:#55605a; --ink3:#8a948d; --line:#dcd8cc; --paper:#f7f5ef; --accent:#2c6246; --wash:#e7eee6; }
  * { box-sizing: border-box; }
  body { margin:0; padding:24px; background:var(--paper); color:var(--ink); font:15px/1.7 "Noto Sans SC","PingFang SC","Microsoft YaHei",system-ui,sans-serif; }
  header { display:flex; flex-wrap:wrap; align-items:baseline; gap:12px; padding-bottom:14px; border-bottom:1px solid var(--line); }
  h1 { margin:0; font-size:22px; font-weight:600; }
  .sub { color:var(--ink3); font-size:13px; }
  .token { margin-left:auto; display:flex; gap:8px; align-items:center; }
  input[type=password] { width:260px; padding:7px 10px; border:1px solid var(--line); border-radius:8px; background:#fff; font:inherit; }
  button { padding:7px 14px; border:1px solid var(--line); border-radius:8px; background:#fff; color:var(--ink); font:inherit; cursor:pointer; }
  button:hover { border-color:var(--accent); color:var(--accent); }
  .tiles { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin:20px 0; }
  .tile { padding:12px 14px; border:1px solid var(--line); border-radius:10px; background:#fff; }
  .tile b { display:block; font-size:12px; font-weight:500; color:var(--ink3); }
  .tile span { display:block; margin-top:4px; font-size:19px; font-variant-numeric:tabular-nums; }
  .ok { color:var(--accent); }
  .bad { color:#8a3b2e; }
  h2 { margin:26px 0 10px; font-size:16px; font-weight:600; }
  .gallery { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:14px; }
  figure { margin:0; border:1px solid var(--line); border-radius:10px; background:#fff; overflow:hidden; }
  figure img { display:block; width:100%; height:200px; object-fit:cover; background:var(--wash); }
  figcaption { padding:9px 11px 11px; font-size:12px; color:var(--ink2); }
  figcaption p { margin:0 0 4px; max-height:3.4em; overflow:hidden; }
  figcaption small { color:var(--ink3); font-variant-numeric:tabular-nums; }
  .more { margin:18px 0 8px; }
  .msg { min-height:22px; margin-top:10px; font-size:13px; color:var(--ink3); }
  .msg.err { color:#8a3b2e; }
  dialog { width:min(900px,92vw); border:1px solid var(--line); border-radius:12px; padding:12px; }
  dialog img { display:block; width:100%; height:auto; }
</style>
</head>
<body>
<header>
  <h1>图片生成</h1>
  <span class="sub">状态、用量与已生成图片 · 仅本机回环地址</span>
  <form class="token" id="token-form">
    <input id="token" type="password" autocomplete="off" placeholder="IMAGE_SERVICE_TOKEN">
    <button type="submit">连接</button>
  </form>
</header>

<div class="tiles" id="tiles"></div>
<div class="msg" id="msg"></div>

<h2>已生成图片</h2>
<div class="gallery" id="gallery"></div>
<p class="more"><button id="more" hidden>加载更多</button></p>

<dialog id="preview"><img id="preview-img" alt=""><button id="close" style="margin-top:10px">关闭</button></dialog>

<script>
const $ = id => document.getElementById(id);
const state = { token: sessionStorage.getItem('imagegen-token') || '', cursor: null, done: false };
const settings = () => ({ Authorization: 'Bearer ' + state.token });

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'text') node.textContent = value;
    else if (key === 'class') node.className = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

function tile(label, value, tone) {
  return el('div', { class: 'tile' }, [el('b', { text: label }), el('span', { class: tone || '', text: String(value) })]);
}

function message(text, bad) {
  const node = $('msg');
  node.textContent = text || '';
  node.className = 'msg' + (bad ? ' err' : '');
}

async function api(path) {
  const response = await fetch(path, { headers: settings() });
  if (response.status === 401) { message('令牌不正确，或服务未配置。', true); throw new Error('unauthorized'); }
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || response.status);
  return response.json();
}

async function loadState() {
  const data = await api('/api/state');
  const h = data.health || {};
  $('tiles').replaceChildren(
    tile('状态', h.status === 'ok' ? '运行中' : h.status, h.status === 'ok' ? 'ok' : 'bad'),
    tile('模型', h.model || '—'),
    tile('并发 / 排队', (h.active ?? 0) + ' / ' + (h.queue ?? 0)),
    tile('今日张数', (data.usage?.count ?? 0) + ' / ' + (data.usage?.limit ?? '—')),
    tile('已存图片', data.stored ?? 0),
    tile('今日字节', ((data.usage?.bytes ?? 0) / 1048576).toFixed(1) + ' MB'),
  );
  message('输出目录：' + (h.outputDir || '—') + (h.lastGeneratedAt ? ' · 最近生成 ' + new Date(h.lastGeneratedAt).toLocaleString() : ''));
}

function card(item) {
  const image = el('img', { src: item.url, alt: item.prompt || item.file, loading: 'lazy' });
  image.addEventListener('click', () => { $('preview-img').src = item.url; $('preview').showModal(); });
  const meta = el('small', { text: item.width + '×' + item.height + ' · ' + (item.bytes / 1024).toFixed(0) + ' KB · ' + new Date(item.createdAt).toLocaleString() });
  return el('figure', {}, [image, el('figcaption', {}, [
    el('p', { text: item.prompt || '' }),
    meta,
    el('small', { text: (item.usage?.total_tokens ? ' · ' + item.usage.total_tokens + ' tokens' : '') + (item.reference ? ' · 参考图 ' + item.reference : '') }),
  ])]);
}

async function loadImages(reset = false) {
  if (reset) { state.cursor = null; state.done = false; $('gallery').replaceChildren(); }
  const query = state.cursor ? '?limit=24&before=' + encodeURIComponent(state.cursor) : '?limit=24';
  const data = await api('/api/images' + query);
  for (const item of data.items) $('gallery').append(card(item));
  state.cursor = data.nextCursor;
  state.done = !data.nextCursor;
  $('more').hidden = state.done;
  if (!data.items.length && reset) message('还没有生成过图片。', false);
}

async function refresh() {
  if (!state.token) { message('输入 IMAGE_SERVICE_TOKEN 后点「连接」。', false); return; }
  try { await loadState(); await loadImages(true); } catch (error) { if (error.message !== 'unauthorized') message(error.message, true); }
}

$('token-form').addEventListener('submit', event => {
  event.preventDefault();
  state.token = $('token').value.trim();
  sessionStorage.setItem('imagegen-token', state.token);
  refresh();
});
$('more').addEventListener('click', () => loadImages(false).catch(error => message(error.message, true)));
$('close').addEventListener('click', () => $('preview').close());
if (state.token) { $('token').value = state.token; refresh(); } else { message('输入 IMAGE_SERVICE_TOKEN 后点「连接」。', false); }
</script>
</body>
</html>`;
