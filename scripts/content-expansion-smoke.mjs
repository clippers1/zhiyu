import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
const screenshotDir = process.env.SCREENSHOT_DIR;
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/indicators`, { waitUntil: 'networkidle' });
  await expect(page.locator('.result-count')).toContainText('找到 9 个专题');
  await expect(page.locator('.indicator-card')).toHaveCount(6);
  await page.getByRole('button', { name: '下一页', exact: true }).click();
  await expect(page.locator('.indicator-card')).toHaveCount(3);
  await expect(page.locator('.indicator-card h3')).toHaveText(['尿酸', '甲状腺功能', '尿常规']);
  await page.getByRole('button', { name: '返回首页', exact: true }).click();

  const input = page.getByRole('textbox', { name: '筛选指标', exact: true });
  for (const [query, title] of [['CBC', '血常规'], ['ALT', '肝功能'], ['eGFR', '肾功能'], ['SUA', '尿酸'], ['FT4', '甲状腺功能'], ['尿沉渣', '尿常规']]) {
    await input.fill(query);
    await expect(page.locator('.indicator-card')).toHaveCount(1);
    await expect(page.locator('.indicator-card h3')).toHaveText(title);
  }

  await input.fill('eGFR');
  await page.locator('.indicator-card').click();
  await expect(page.getByRole('heading', { name: '认识肾功能', exact: true })).toBeVisible();
  await expect(page.locator('.source-list li')).toHaveCount(3);
  await expect(page.getByText(/不提供分期阈值/)).toBeVisible();
  await expect(page.getByRole('link', { name: /继续了解肾脏/ })).toBeVisible();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile content expansion must not overflow');
  if (screenshotDir) {
    await mkdir(screenshotDir, { recursive: true });
    await page.screenshot({ path: `${screenshotDir}/kidney-function-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${base}/indicators`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${screenshotDir}/indicator-library-desktop.png`, fullPage: true });
  }

  const noJS = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await noJS.goto(`${base}/article/cbc`);
  await expect(noJS.getByRole('heading', { name: '认识血常规', exact: true })).toBeVisible();
  await expect(noJS.locator('.source-list')).toContainText('Complete Blood Count');
  await noJS.close();
  assert.deepEqual(errors, []);
  console.log('PASS nine-topic library, pagination, six new search aliases, detail sources/limits/relations, responsive layout and no-JS SSR.');
} finally {
  await browser.close();
}
