import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
const ssr = process.env.TEST_SSR === 'true';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await expect(page.locator('.topic-cards a')).toHaveCount(3);
  await page.locator('.topic-cards a[href="/topics/glucose"]').click();
  await expect(page.getByRole('heading', { name: '认识血糖的阅读路线' })).toBeVisible();
  await expect(page.locator('.topic-steps li')).toHaveCount(4);
  await expect(page.locator('.topic-steps')).toContainText('来源与表达待完整核对');
  await page.locator('.topic-steps a').first().click();
  await expect(page.getByRole('heading', { name: '认识血糖', exact: true })).toBeVisible();
  await page.locator('.topic-followup a[href="/organs/pancreas"]').click();
  await expect(page.locator('.organ-information h2')).toContainText('胰腺');
  await page.getByRole('link', { name: '查看血糖阅读路线' }).click();
  await page.getByRole('link', { name: '最后核对来源' }).click();
  await expect(page).toHaveURL(/\/article\/glucose#article-source-panel$/);
  await expect(page.locator('#article-source-panel')).toBeInViewport();
  assert.equal(await page.evaluate(() => localStorage.getItem('zhiyu-reading-v1')), null);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/topics/glucose`, { waitUntil: 'networkidle' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `route overflow at ${width}`);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('.topic-steps li')).toHaveCount(4);
  }
  if (ssr) {
    const noJS = await browser.newPage({ javaScriptEnabled: false });
    await noJS.goto(base);
    await noJS.locator('.topic-cards a[href="/topics/glucose"]').click();
    await expect(noJS.locator('.topic-steps li')).toHaveCount(4);
    await expect(noJS.locator('link[rel="canonical"]')).toHaveAttribute('href', `${base}/topics/glucose`);
    await noJS.getByRole('link', { name: '最后核对来源' }).click();
    await expect(noJS.locator('#article-source-panel')).toBeInViewport();
    assert.equal((await noJS.goto(`${base}/topics/not-real`)).status(), 404);
    await noJS.close();
  } else {
    const catalog = JSON.parse(await readFile('public/content/index.json', 'utf8'));
    let fail = false;
    let fixture = { ...catalog, items: catalog.items.filter(item => item.kind !== 'organ') };
    await page.route('**/content/index.json', route => fail ? route.abort() : route.fulfill({ json: fixture }));
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('.topic-steps li')).toHaveCount(2);
    await expect(page.getByText(/目前没有可阅读的关联器官专题/)).toBeVisible();
    fail = true;
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('[role="alert"]')).toBeVisible();
    fail = false; fixture = catalog;
    await page.getByRole('button', { name: '重新加载' }).click();
    await expect(page.locator('.topic-steps li')).toHaveCount(4);
  }
  assert.deepEqual(errors, []);
  console.log('PASS topic entry, reading loop, source anchor, refresh, responsive layout, no tracking, ' + (ssr ? 'no-JS SSR and real 404' : 'unavailable relationships and retry'));
} finally { await browser.close(); }
