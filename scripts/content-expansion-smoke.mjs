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
  await expect(page.locator('.result-count')).toContainText('找到 14 个项目专题');
  await expect(page.locator('.question-row')).toHaveCount(6);
  await page.getByRole('button', { name: '下一页', exact: true }).click();
  await expect(page.locator('.question-row')).toHaveCount(6);
  await expect(page.locator('.question-row .question-row-term b')).toHaveText(['尿酸', '甲状腺功能', '尿常规', '脂肪肝', '甲状腺结节', '肺结节']);
  await page.getByRole('button', { name: '下一页', exact: true }).click();
  await expect(page.locator('.question-row')).toHaveCount(2);
  await expect(page.locator('.question-row .question-row-term b')).toHaveText(['心电图', '肿瘤标志物']);
  await page.getByRole('button', { name: '返回首页', exact: true }).click();

  const input = page.getByRole('textbox', { name: '筛选体检项目', exact: true });
  for (const [query, title] of [
    ['CBC', '血常规'],
    ['TBIL', '肝功能'],
    ['eGFR', '肾功能'],
    ['SUA', '尿酸'],
    ['FT4', '甲状腺功能'],
    ['尿沉渣', '尿常规'],
    ['MASLD', '脂肪肝'],
    ['TI-RADS', '甲状腺结节'],
    ['GGO', '肺结节'],
    ['Holter', '心电图'],
    ['CEA', '肿瘤标志物'],
  ]) {
    await input.fill(query);
    await expect(page.locator('.question-row')).toHaveCount(1);
    await expect(page.locator('.question-row .question-row-term b')).toHaveText(title);
  }
  await input.fill('ALT');
  await expect(page.locator('.question-row')).toHaveCount(2);
  await expect(page.locator('.question-row .question-row-term b')).toHaveText(['肝功能', '脂肪肝']);

  await input.fill('eGFR');
  await page.locator('.question-row').click();
  await expect(page.getByRole('heading', { name: '肌酐和肾功能是什么关系？', exact: true })).toBeVisible();
  await expect(page.locator('.source-list li')).toHaveCount(4);
  await expect(page.getByText(/^不覆盖：不提供分期阈值/)).toBeVisible();
  await expect(page.getByRole('link', { name: /继续了解肾脏|探索肾脏/ })).toBeVisible();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile content expansion must not overflow');
  if (screenshotDir) {
    await mkdir(screenshotDir, { recursive: true });
    await page.screenshot({ path: `${screenshotDir}/kidney-function-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${base}/indicators`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${screenshotDir}/indicator-library-desktop.png`, fullPage: true });
  }

  const noJSBase = process.env.SSR_PLAYWRIGHT_BASE_URL;
  if (noJSBase) {
    const noJS = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await noJS.goto(`${noJSBase}/article/cbc`);
    await expect(noJS.getByRole('heading', { name: '血常规里常见名称各指什么？', exact: true })).toBeVisible();
    await expect(noJS.locator('.source-list')).toContainText('Complete Blood Count');
    await noJS.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS nine-topic question library, pagination, six search aliases, detail sources/limits/relations, responsive layout and no-JS SSR.');
} finally {
  await browser.close();
}