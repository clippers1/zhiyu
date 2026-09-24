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
  await expect(page.locator('.question-card')).toHaveCount(9);
  await expect(page.locator('.organ-topic-links a')).toHaveCount(5);
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
  await page.getByRole('link', { name: /想认识身体原理/ }).click();
  await expect(page.getByRole('heading', { name: /进一步理解：身体如何运作/ })).toBeInViewport();
  await page.locator('.organ-topic-links').getByRole('link', { name: /肝脏/ }).click();
  await expect(page.locator('.organ-information h2')).toContainText('肝脏');
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
    await noJS.getByRole('link', { name: /想认识身体原理/ }).click();
    await expect(noJS.getByRole('heading', { name: /进一步理解：身体如何运作/ })).toBeInViewport();
    await noJS.locator('.organ-topic-links').getByRole('link', { name: /心脏/ }).click();
    await expect(noJS.locator('.organ-information h2')).toContainText('心脏');
    await noJS.goto(base);
    await noJS.getByRole('link', { name: /体检项目看不懂/ }).click();
    await expect(noJS.locator('#indicator-search')).toBeInViewport();
    await expect(noJS.locator('.question-row')).toHaveCount(6);
    await noJS.close();
  } else {
    const catalog = JSON.parse(await readFile('public/content/index.json', 'utf8'));
    let fixture = { ...catalog, items: catalog.items.filter(item => item.id !== 'heart') };
    let fail = false;
    await page.route('**/content/index.json', route => fail ? route.abort() : route.fulfill({ json: fixture }));
    await page.goto(base, { waitUntil: 'networkidle' });
    await expect(page.locator('.organ-topic-links a')).toHaveCount(4);
    await expect(page.locator('.body-art .organ-heart')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('.body-art .organ-heart')).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('.organ-topic-links a[href="/organs/heart"]')).toHaveCount(0);
    fixture = { ...catalog, items: [] };
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('.organ-topic-links a')).toHaveCount(0);
    await expect(page.locator('.question-card')).toHaveCount(0);
    await expect(page.getByText(/器官专题暂未开放/)).toBeVisible();
    await page.goto(`${base}/indicators`, { waitUntil: 'networkidle' });
    await expect(page.locator('.term-suggestions')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '没有匹配的项目' })).toBeVisible();
    fail = true;
    await page.goto(base, { waitUntil: 'networkidle' });
    await expect(page.locator('#organ-topics [role="alert"]')).toBeVisible();
    fail = false;
    fixture = catalog;
    await page.locator('#organ-topics').getByRole('button', { name: '重新加载' }).click();
    await expect(page.locator('.organ-topic-links a')).toHaveCount(5);
    await page.unroute('**/content/index.json');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: 'networkidle' });
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/discovery-mobile.png' });
  assert.deepEqual(errors, []);
  console.log('PASS task entry paths, terminology examples, reading/source navigation, privacy defaults, keyboard and responsive layouts; ' + (ssr ? 'no-JS entry navigation.' : 'unavailable/empty content and failure recovery.'));
} finally { await browser.close(); }
