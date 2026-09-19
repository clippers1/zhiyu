import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
const key = 'zhiyu-reading-v1';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const stored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
try {
  await page.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
  assert.equal(await stored(), null, 'No history written before opt-in');
  await page.getByRole('navigation', { name: '文章目录' }).getByRole('link', { name: '认识指标' }).click();
  await expect(page.locator('#article-metrics')).toBeInViewport();
  await page.getByRole('button', { name: '大字号', exact: true }).click();
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: '大字号', exact: true })).toHaveAttribute('aria-pressed', 'true');
  assert.equal(await page.locator('.detail-intro').evaluate(el => getComputedStyle(el).fontSize), '18px');
  assert.deepEqual((await stored()).entries, []);
  await page.goto(`${base}/saved`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '开启本地阅读记录' }).click();
  await page.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
  await page.goto(`${base}/organs/liver`, { waitUntil: 'networkidle' });
  await page.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
  assert.deepEqual((await stored()).entries.map(x => x.id), ['glucose', 'liver']);
  await page.goto(`${base}/saved`, { waitUntil: 'networkidle' });
  await expect(page.locator('.recent-list a')).toHaveCount(2);
  await expect(page.locator('.recent-list a').first()).toContainText('血糖');

  const second = await context.newPage();
  await second.goto(`${base}/saved`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '清空阅读记录', exact: true }).click();
  await expect(second.getByRole('button', { name: '清空阅读记录', exact: true })).toBeDisabled();
  assert.equal((await stored()).enabled, true);
  assert.deepEqual((await stored()).entries, []);
  await page.getByRole('button', { name: '关闭并清除记录' }).click();
  await expect(second.getByRole('button', { name: '开启本地阅读记录' })).toBeVisible();
  await second.close();
  await page.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
  assert.deepEqual((await stored()).entries, []);

  await page.goto(`${base}/indicators`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '搜索指标或器官', exact: true }).click();
  await page.getByRole('textbox', { name: '搜索指标或器官', exact: true }).fill('不存在的专题xyz');
  await page.getByRole('button', { name: '查找血糖', exact: true }).click();
  await page.getByRole('link', { name: /指标 血糖/ }).click();
  await expect(page.getByRole('heading', { name: '认识血糖' })).toBeVisible();

  await page.goto(`${base}/article/glucose?private=do-not-share#article-metrics`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.sharedURL = text; } } });
  });
  await page.getByRole('button', { name: '分享这篇知识' }).click();
  assert.equal(await page.evaluate(() => window.sharedURL), `${base}/article/glucose`);

  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ['/article/glucose', '/organs/liver', '/saved']) {
      await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Large text overflow at ${width} ${path}`);
    }
  }
  await page.evaluate(key => localStorage.setItem(key, '{broken'), key);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: '开启本地阅读记录' })).toBeVisible();

  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ enabled: true, large: false, entries: [
    { kind: 'indicator', id: 'glucose', at: Date.now() - 91 * 86400000 },
    { kind: 'indicator', id: 'unavailable-topic', at: Date.now() },
  ] })), key);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.recent-list a')).toHaveCount(0);
  assert.equal((await stored()).entries.length, 1, 'Expired records pruned from storage');
  await page.getByRole('button', { name: '关闭并清除记录' }).click();

  const blocked = await browser.newPage();
  await blocked.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'QuotaExceededError'); };
  });
  await blocked.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
  await blocked.getByRole('button', { name: '大字号', exact: true }).click();
  await expect(blocked.locator('.reading-tools')).toContainText('无法写入浏览器');
  await expect(blocked.getByRole('button', { name: '大字号', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await blocked.getByRole('button', { name: '大字号', exact: true }).click();
  await expect(blocked.getByRole('button', { name: '大字号', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await blocked.close();

  if (process.env.TEST_SSR === 'true') {
    const noJS = await browser.newPage({ javaScriptEnabled: false });
    await noJS.goto(`${base}/article/glucose`);
    await noJS.getByRole('navigation', { name: '文章目录' }).getByRole('link', { name: '认识指标' }).click();
    await expect(noJS.locator('#article-metrics')).toBeInViewport();
    await noJS.close();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/reading-mobile.png' });
  assert.deepEqual(errors, []);
  console.log('PASS reading TOC, text preferences, opt-in/local history, deduplication, expiry, unavailable entries, cross-tab clearing, storage failure, search guidance, clean sharing and mobile layout.');
} finally { await browser.close(); }
