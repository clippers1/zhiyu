import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(`${base}/indicators`, { waitUntil: 'networkidle' });
  const input = page.getByRole('textbox', { name: '筛选指标', exact: true });
  await expect(input).toHaveAttribute('maxlength', '200');
  for (const [query, title] of [['ＬＤＬ－Ｃ', '血脂'], ['l d l c', '血脂'], ['ＨｂＡ１ｃ', '血糖'], ['blood glucose', '血糖'], ['高压', '血压']]) {
    await input.fill(query);
    await expect(page.locator('.indicator-card')).toHaveCount(1);
    await expect(page.locator('.indicator-card h3')).toHaveText(title);
    await expect(page.locator('.indicator-card .search-match')).toBeVisible();
  }
  await input.fill('glcuose');
  await expect(page.locator('.indicator-card')).toHaveCount(0);
  await page.getByRole('button', { name: '查找BLOOD GLUCOSE', exact: true }).click();
  await expect(input).toHaveValue('BLOOD GLUCOSE');
  await expect(page.locator('.indicator-card h3')).toHaveText('血糖');
  await page.getByRole('button', { name: '心血管健康', exact: true }).click();
  await expect(page.getByRole('heading', { name: '暂时没有匹配的内容' })).toBeVisible();
  await page.getByRole('button', { name: '保留关键词，清除分类限制' }).click();
  await expect(input).toHaveValue('BLOOD GLUCOSE');
  await expect(page.locator('.indicator-card h3')).toHaveText('血糖');
  await input.fill('%');
  await expect(page.getByRole('heading', { name: '暂时没有匹配的内容' })).toBeVisible();
  await expect(page.locator('.indicator-card')).toHaveCount(0);

  await page.getByRole('button', { name: '搜索指标或器官', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const search = dialog.getByRole('textbox');
  await search.fill('liver');
  await expect(dialog.locator('.search-results > a')).toHaveCount(1);
  await expect(dialog.locator('.search-results > a')).toContainText('肝脏');
  await search.dispatchEvent('compositionstart');
  await search.fill('血');
  await page.waitForTimeout(350);
  await expect(dialog.locator('.search-results > a')).toHaveCount(0);
  await expect(dialog.getByRole('status')).toContainText('输入完成后查找');
  await search.fill('血糖');
  await search.dispatchEvent('compositionend');
  await expect(dialog.locator('.search-results > a').first()).toContainText('指标血糖');
  await search.fill('glcuose');
  await expect(dialog.locator('.search-results > a')).toHaveCount(0);
  await dialog.getByRole('button', { name: '查找BLOOD GLUCOSE', exact: true }).click();
  await expect(dialog.locator('.search-results > a')).toHaveCount(1);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await search.fill('glcuose');
    await expect(dialog.getByRole('button', { name: '查找BLOOD GLUCOSE', exact: true })).toBeVisible();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/search-mobile.png' });
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  assert.ok(!stored.includes('glcuose') && !stored.includes('BLOOD GLUCOSE'));
  assert.deepEqual(errors, []);
  console.log('PASS normalized search, match labels, confirmed suggestions, filter reset, punctuation safety, IME/stale-result handling, mobile layout and no search history.');
} finally { await browser.close(); }
