import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
const key = 'zhiyu-reading';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const stored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
try {
  await page.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
  assert.equal(await stored(), null, 'No preferences written before opt-in');
  await expect(page.getByRole('heading', { name: '血糖项目主要看什么？', exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: '文章目录' }).getByRole('link', { name: '它是什么' }).click();
  await expect(page.locator('#article-overview')).toBeInViewport();

  // 大字号 is a global preference in 偏好设置; it persists and enlarges article text.
  await page.getByRole('button', { name: '偏好设置' }).click();
  const dialog = page.getByRole('dialog');
  const largeSwitch = dialog.getByRole('switch');
  await expect(largeSwitch).toBeEnabled();
  await largeSwitch.click();
  await expect(largeSwitch).toHaveAttribute('aria-checked', 'true');
  await dialog.getByRole('button', { name: '关闭弹窗' }).click();
  assert.equal(await page.locator('.detail-intro').evaluate(el => getComputedStyle(el).fontSize), '18px');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('.detail-intro').evaluate(el => getComputedStyle(el).fontSize), '18px');
  assert.deepEqual(await stored(), { large: true }, 'Only the size preference is persisted');
  await page.getByRole('button', { name: '偏好设置', exact: true }).click();
  await page.getByRole('dialog').getByRole('switch').click();
  await expect(page.getByRole('dialog').getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  await page.keyboard.press('Escape');
  assert.deepEqual(await stored(), { large: false });

  // Search guidance: unknown words stay safe and lead back to published content.
  await page.goto(`${base}/indicators`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '搜索体检项目或器官', exact: true }).click();
  const searchDialog = page.getByRole('dialog');
  await page.getByRole('textbox', { name: '搜索体检项目或器官', exact: true }).fill('不存在的专题xyz');
  await expect(searchDialog.locator('.search-results > a')).toHaveCount(0);
  await searchDialog.getByRole('link', { name: '浏览已开放的体检项目' }).click();
  await page.getByRole('link', { name: /血糖项目主要看什么/ }).first().click();
  await expect(page.getByRole('heading', { name: '血糖项目主要看什么？' })).toBeVisible();
  assert.equal(await page.evaluate(k => localStorage.getItem(k), key), '{"large":false}', 'Search never writes history');

  // Sharing strips private query strings and keeps a clean URL.
  await page.goto(`${base}/article/glucose?private=do-not-share#article-metrics`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.sharedURL = text; } } });
  });
  await page.getByRole('button', { name: '分享这篇知识' }).click();
  assert.equal(await page.evaluate(() => window.sharedURL), `${base}/article/glucose`);

  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ['/article/glucose', '/organs/liver', '/indicators']) {
      await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Large text overflow at ${width} ${path}`);
    }
  }
  await page.evaluate(key => localStorage.setItem(key, '{broken'), key);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '偏好设置', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('switch')).toBeEnabled();
  await page.keyboard.press('Escape');

  // A blocked storage backend keeps the in-session switch working and reports the failure.
  const blocked = await browser.newPage();
  await blocked.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'QuotaExceededError'); };
  });
  await blocked.setViewportSize({ width: 390, height: 844 });
  await blocked.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
  await blocked.getByRole('button', { name: '偏好设置', exact: true }).click();
  await blocked.getByRole('dialog').getByRole('switch').click();
  await expect(blocked.getByRole('dialog').getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  await expect(blocked.getByRole('dialog').locator('.tools-warning')).toContainText('无法写入浏览器');
  await expect(blocked.locator('.detail-intro').evaluate(() => document.querySelector('.app')?.classList.contains('reading-large'))).toBeTruthy();
  await blocked.getByRole('dialog').getByRole('switch').click();
  await expect(blocked.getByRole('dialog').getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  await blocked.close();

  if (process.env.TEST_SSR === 'true') {
    const noJS = await browser.newPage({ javaScriptEnabled: false });
    await noJS.goto(`${base}/article/glucose`);
    await expect(noJS.locator('.reading-bar')).toHaveCSS('position', 'static');
    await noJS.getByRole('navigation', { name: '文章目录' }).getByRole('link', { name: '它是什么' }).click();
    await expect(noJS.locator('#article-overview')).toBeInViewport();
    await noJS.close();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/reading-mobile.png' });
  assert.deepEqual(errors, []);
  console.log('PASS reading TOC, text preferences via settings dialog, storage failure handling, search guidance, clean sharing and mobile layout.');
} finally { await browser.close(); }
