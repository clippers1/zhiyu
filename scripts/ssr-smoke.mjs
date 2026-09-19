import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3110';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const errors = [];
try {
  const noJS = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  for (const path of ['/', '/indicators', '/article/glucose', '/organs/liver']) {
    const response = await noJS.goto(`${base}${path}`);
    assert.equal(response.status(), 200);
    assert.match(response.headers()['cache-control'], /no-store/);
    await expect(noJS.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(noJS.locator('link[rel="canonical"]')).toHaveAttribute('href', new URL(path, base).href);
    if (path.includes('glucose')) {
      await expect(noJS.getByRole('heading', { name: '认识血糖', exact: true })).toBeVisible();
      await expect(noJS.locator('.detail-intro')).toContainText('葡萄糖');
      await expect(noJS.locator('.source-list a')).toHaveCount(4);
      await expect(noJS.getByRole('link', { name: '探索器官', exact: true })).toHaveAttribute('href', '/organs/liver');
    }
    if (path.includes('liver')) await expect(noJS.locator('.organ-description')).toContainText('处理吸收的营养');
  }
  await noJS.goto(`${base}/`);
  await noJS.getByRole('link', { name: /01 血糖/ }).click();
  await expect(noJS.getByRole('heading', { name: '认识血糖' })).toBeVisible();
  for (const path of ['/article/does-not-exist', '/no-such-page', '/assets/no-such.js']) {
    const response = await noJS.goto(`${base}${path}`);
    assert.equal(response.status(), 404);
    await expect(noJS.getByRole('heading', { name: '认识血糖' })).toHaveCount(0);
  }
  const sitemap = await noJS.request.get(`${base}/sitemap.xml`);
  assert.equal(sitemap.status(), 200); assert.ok(!(await sitemap.text()).includes('<url>'));
  await noJS.close();

  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const detailRequests = [];
  page.on('request', request => { if (request.url().includes('/api/demo/content/indicator/glucose')) detailRequests.push(request.url()); });
  await page.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
  assert.equal(detailRequests.length, 0, 'SSR hydration must not refetch the initial article');
  await expect(page).toHaveTitle(/血糖.*知愈/);
  await page.getByRole('button', { name: '收藏知识', exact: true }).click();
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: '已收藏', exact: true })).toBeVisible();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('zhiyu-saved')).includes('glucose')), true);
  await page.goto(`${base}/saved`, { waitUntil: 'networkidle' });
  await expect(page.locator('.indicator-card')).toHaveCount(1);
  await page.getByRole('link', { name: /01 血糖/ }).click();
  await expect(page.getByRole('heading', { name: '认识血糖' })).toBeVisible();
  await page.getByRole('link', { name: '查看参考资料 2', exact: true }).first().click();
  await expect(page.locator('#article-source-tests')).toBeInViewport();
  await page.getByRole('link', { name: '探索器官', exact: true }).click();
  await expect(page.locator('.organ-information h2')).toContainText('肝脏');
  await page.getByRole('button', { name: '搜索指标或器官', exact: true }).click();
  await page.getByRole('textbox').fill('LDL');
  await page.getByRole('link', { name: /指标 血脂/ }).click();
  await expect(page).toHaveTitle(/血脂.*知愈/);
  await page.goBack({ waitUntil: 'networkidle' });
  await expect(page.locator('.organ-information h2')).toContainText('肝脏');
  await page.goto(`${base}/?from=legacy#/article/glucose`, { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(`${base}/article/glucose?from=legacy`);
  await expect(page.getByRole('heading', { name: '认识血糖' })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${base}/article/glucose`);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.sharedURL = text; } } });
  });
  await page.getByRole('button', { name: '分享这篇知识' }).click();
  await expect(page.getByText('链接已复制', { exact: true })).toBeVisible();
  assert.ok((await page.evaluate(() => window.sharedURL)).includes('/article/glucose'));
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ['/', '/indicators', '/organs/heart', '/article/glucose']) {
      await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px ${path}`);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/ssr-mobile.png' });
  assert.deepEqual(errors, [], 'No hydration or browser errors');
  console.log('PASS no-JS reading/navigation, real 404, metadata/noindex, hydration, existing bookmarks, search, sharing, history and mobile layouts.');
} finally { await browser.close(); }
