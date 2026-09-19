import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
const ssr = process.env.TEST_SSR === 'true';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
async function decode() {
  await page.addScriptTag({ path: 'node_modules/jsqr/dist/jsQR.js' });
  return page.locator('.share-card-preview').evaluate(async img => {
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
    return { width: canvas.width, height: canvas.height, url: window.jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)?.data };
  });
}
try {
  await page.goto(`${base}/article/glucose?private=do-not-share#article-metrics`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '生成分享卡片', exact: true }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.locator('.share-card-preview')).toBeVisible({ timeout: 15000 });
  await expect(modal.locator('.share-card-status')).toContainText('待专业审校');
  await expect(modal.getByRole('textbox', { name: '卡片阅读链接' })).toHaveValue(`${base}/article/glucose`);
  assert.deepEqual(await decode(), { width: 1080, height: 1440, url: `${base}/article/glucose` });
  await mkdir('artifacts', { recursive: true });
  const downloadEvent = page.waitForEvent('download');
  await modal.getByRole('link', { name: '下载 PNG 图片' }).click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), 'zhiyu-indicator-glucose.png');
  await download.saveAs('artifacts/share-card-glucose.png');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copiedCardURL = text; } } });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false });
  });
  await modal.getByRole('button', { name: '复制阅读链接', exact: true }).click();
  assert.equal(await page.evaluate(() => window.copiedCardURL), `${base}/article/glucose`);
  await modal.getByRole('button', { name: '系统分享图片', exact: true }).click();
  await expect(modal.locator('.share-card-message')).toContainText('不支持系统分享图片');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('cancel', 'AbortError'); } });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
  });
  await modal.getByRole('button', { name: '系统分享图片', exact: true }).click();
  await expect(modal.locator('.share-card-message')).toContainText('已取消分享');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.sharedCard = { name: data.files[0].name, type: data.files[0].type, size: data.files[0].size }; } });
  });
  await modal.getByRole('button', { name: '系统分享图片', exact: true }).click();
  const shared = await page.evaluate(() => window.sharedCard);
  assert.equal(shared.type, 'image/png'); assert.ok(shared.size > 10000);
  await expect(modal.locator('.share-card-message')).toContainText('请在目标应用确认发送');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new Error('unavailable'); } });
  });
  await modal.getByRole('button', { name: '系统分享图片', exact: true }).click();
  await expect(modal.locator('.share-card-message')).toContainText('系统分享暂不可用');
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }); });
  await modal.getByRole('button', { name: '复制阅读链接', exact: true }).click();
  await expect(modal.locator('.share-card-message')).toContainText('请选中下方阅读链接复制');
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.ok(await modal.evaluate(node => node.scrollWidth <= node.clientWidth));
  }

  // Rechecking a withdrawn/unavailable record discards the old preview and URL.
  const oldURL = await modal.locator('img').getAttribute('src');
  const pattern = ssr ? '**/api/demo/content/indicator/glucose' : '**/content/indicator/glucose.json';
  await page.route(pattern, route => route.fulfill({ status: 404, json: { error: 'not_found' } }));
  await modal.getByRole('button', { name: '重新核对并生成' }).click();
  await expect(modal.getByRole('alert')).toBeVisible();
  await expect(modal.locator('img')).toHaveCount(0);
  await expect(modal.getByRole('link', { name: '下载 PNG 图片' })).toHaveCount(0);
  assert.equal(await page.evaluate(async url => { try { await fetch(url); return false; } catch { return true; } }, oldURL), true);
  await page.unroute(pattern);
  await modal.getByRole('button', { name: '重试生成', exact: true }).click();
  await expect(modal.locator('.share-card-preview')).toBeVisible({ timeout: 15000 });
  const currentURL = await modal.locator('img').getAttribute('src');
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  assert.equal(await page.evaluate(async url => { try { await fetch(url); return false; } catch { return true; } }, currentURL), true);
  await expect(page.getByRole('button', { name: '生成分享卡片', exact: true })).toBeFocused();

  // A new public title must be used instead of the article bootstrap snapshot.
  const detail = await (await page.request.get(`${base}${ssr ? '/api/demo/content/indicator/glucose' : '/content/indicator/glucose.json'}`)).json();
  await page.route(pattern, route => route.fulfill({ json: { ...detail, title: '已发布新标题'.repeat(35), subtitle: '长摘要'.repeat(150) } }));
  await page.getByRole('button', { name: '生成分享卡片', exact: true }).click();
  await expect(modal.locator('img')).toHaveAttribute('alt', /已发布新标题/);
  assert.equal((await decode()).url, `${base}/article/glucose`);
  await page.unroute(pattern);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => localStorage.getItem('zhiyu-reading-v1')), null);
  await page.goto(`${base}/organs/liver`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '生成分享卡片', exact: true }).click();
  await expect(modal.locator('img')).toHaveAttribute('alt', /肝脏/);
  assert.equal((await decode()).url, `${base}/organs/liver`);
  if (ssr) {
    const noJS = await browser.newPage({ javaScriptEnabled: false });
    await noJS.goto(`${base}/article/glucose`);
    await expect(noJS.getByRole('button', { name: '生成分享卡片', exact: true })).toBeDisabled();
    await expect(noJS.getByRole('heading', { name: '认识血糖', exact: true })).toBeVisible();
    await noJS.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS local PNG generation/download, independent QR decoding, current publication recheck, withdrawal/retry, clean URLs, native-share fallbacks, long text, organ cards, object URL cleanup and mobile layouts');
} finally { await browser.close(); }
