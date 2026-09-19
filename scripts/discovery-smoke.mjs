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
  await expect(page.locator('.start-grid a')).toHaveCount(3);
  await expect(page.locator('.organ-topic-links a')).toHaveCount(5);
  await page.locator('.start-grid a').first().focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/indicators#indicator-search$/);
  await expect(page.locator('#indicator-search')).toBeInViewport();
  await page.getByRole('textbox', { name: '筛选指标' }).fill('LDL');
  await expect(page.locator('.indicator-card')).toHaveCount(1);
  await expect(page.locator('.indicator-card')).toContainText('血脂');
  await page.getByRole('textbox', { name: '筛选指标' }).fill('');
  await page.getByRole('button', { name: '空腹血糖', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '筛选指标' })).toHaveValue('空腹血糖');
  await page.getByRole('link', { name: /01 血糖/ }).click();
  await expect(page.getByRole('heading', { name: '认识血糖' })).toBeVisible();
  await page.getByRole('link', { name: '核对来源', exact: true }).click();
  await expect(page.locator('#article-source-panel')).toBeInViewport();

  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: /认识一个器官/ }).click();
  await expect(page.getByRole('heading', { name: '先选一个想了解的器官' })).toBeInViewport();
  await page.locator('.organ-topic-links').getByRole('link', { name: /肝脏/ }).click();
  await expect(page.locator('.organ-information h2')).toContainText('肝脏');
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: /找回读过的知识/ }).click();
  await expect(page).toHaveURL(/\/saved#reading-collection$/);
  await expect(page.locator('#reading-collection')).toBeInViewport();
  await expect(page.getByRole('button', { name: '开启本地阅读记录' })).toBeVisible();
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
    await noJS.getByRole('link', { name: /认识一个器官/ }).click();
    await expect(noJS.getByRole('heading', { name: '先选一个想了解的器官' })).toBeInViewport();
    await noJS.locator('.organ-topic-links').getByRole('link', { name: /心脏/ }).click();
    await expect(noJS.locator('.organ-information h2')).toContainText('心脏');
    await noJS.goto(base);
    await noJS.getByRole('link', { name: /查体检单上的术语/ }).click();
    await expect(noJS.locator('#indicator-search')).toBeInViewport();
    await expect(noJS.locator('.indicator-card')).toHaveCount(3);
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
    await expect(page.locator('.daily-card')).toHaveCount(0);
    await expect(page.getByText(/器官专题暂未开放/)).toBeVisible();
    await page.goto(`${base}/indicators`, { waitUntil: 'networkidle' });
    await expect(page.locator('.term-suggestions')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '暂时没有匹配的内容' })).toBeVisible();
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
