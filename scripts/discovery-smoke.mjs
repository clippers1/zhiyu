import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
const ssr = process.env.TEST_SSR === 'true';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await expect(page.locator('.home-feature')).toHaveCount(1);
  await expect(page.locator('.home-quick-pill')).toHaveCount(8);
  await expect(page.locator('.home-index:not(.home-stories) .index-row')).toHaveCount(8);
  await expect(page.locator('.home-stories .index-row')).toHaveCount(4);
  await expect(page.locator('.home-reading-path a')).toHaveCount(1);
  await expect(page.locator('#organ-topics .body-row')).toHaveCount(6);
  await page.locator('.home-search-trigger').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/indicators#indicator-search$/);
  await expect(page.locator('#indicator-search')).toBeInViewport();
  await page.getByRole('textbox', { name: '筛选体检项目' }).fill('LDL');
  await expect(page.locator('.question-row')).toHaveCount(1);
  await expect(page.locator('.question-row')).toContainText('血脂');
  await page.getByRole('textbox', { name: '筛选体检项目' }).fill('');
  await page.getByRole('link', { name: /血糖项目主要看什么/ }).first().click();
  await expect(page.getByRole('heading', { name: '血糖项目主要看什么？' })).toBeVisible();
  await page.getByRole('link', { name: '核对来源', exact: true }).click();
  await expect(page.locator('#article-source-panel')).toBeInViewport();

  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('#organ-topics .body-row').filter({ hasText: '心脏' }).click();
  await expect(page.locator('.organ-information h2')).toContainText('心脏');
  await page.goto(base, { waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: '1 分钟认识身体' })).toBeVisible();
  // H02 首页不再有收藏/阅读记录入口；本地记录只在文章内显式开启。
  assert.equal(await page.evaluate(() => localStorage.getItem('zhiyu-reading-v1')), null);

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/indicators']) {
      await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} overflows at ${width}`);
    }
  }
  if (ssr) {
    const noJS = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await noJS.goto(base);
    await noJS.locator('#organ-topics .body-row').filter({ hasText: '心脏' }).click();
    await expect(noJS.locator('.organ-information h2')).toContainText('心脏');
    await noJS.goto(base);
    await noJS.locator('.home-search-trigger').click();
    await expect(noJS.locator('#indicator-search')).toBeInViewport();
    await expect(noJS.locator('.question-row')).toHaveCount(6);
    await noJS.close();
  } else {
    const catalog = JSON.parse(await readFile('public/content/index.json', 'utf8'));
    let fixture = { ...catalog, items: catalog.items.filter(item => item.id !== 'heart') };
    let fail = false;
    await page.route('**/content/index.json', route => fail ? route.abort() : route.fulfill({ json: fixture }));
    await page.goto(base, { waitUntil: 'networkidle' });
    await expect(page.locator('#organ-topics .body-row')).toHaveCount(5);
    await expect(page.locator('#organ-topics a[href="/organs/heart"]')).toHaveCount(0);
    fixture = { ...catalog, items: [] };
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('#organ-topics')).toHaveCount(0);
    await expect(page.locator('.home-feature')).toHaveCount(0);
    await expect(page.locator('.home-quick-pill')).toHaveCount(0);
    await expect(page.locator('.index-row')).toHaveCount(0);
    await expect(page.locator('.home-stories')).toHaveCount(0);
    await expect(page.locator('.home-reading-path')).toHaveCount(0);
    await expect(page.getByText(/目前没有可阅读的问题/)).toBeVisible();
    await page.goto(`${base}/indicators`, { waitUntil: 'networkidle' });
    await expect(page.locator('.term-suggestions')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '没有匹配的项目' })).toBeVisible();
    fail = true;
    await page.goto(base, { waitUntil: 'networkidle' });
    await expect(page.locator('#organ-topics [role="alert"]')).toBeVisible();
    fail = false;
    fixture = catalog;
    await page.locator('#organ-topics').getByRole('button', { name: '重新加载' }).click();
    await expect(page.locator('#organ-topics .body-row')).toHaveCount(6);
    await page.unroute('**/content/index.json');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: 'networkidle' });
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/discovery-mobile.png' });
  assert.deepEqual(errors, []);
  console.log('PASS task entry paths, terminology examples, reading/source navigation, privacy defaults, keyboard and responsive layouts; ' + (ssr ? 'no-JS entry navigation.' : 'unavailable/empty content and failure recovery.'));
} finally { await browser.close(); }
