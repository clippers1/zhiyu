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
  await page.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
  await expect(page.locator('#article-figure')).toBeVisible();
  const image = page.locator('#article-figure img');
  await expect(image).toHaveAttribute('src', '/media/pancreas-servier.png');
  await expect(image).toHaveAttribute('alt', /.+/);
  await expect(image).toHaveAttribute('loading', 'lazy');
  await expect(page.locator('#article-figure')).toContainText('胰腺：分泌胰岛素帮助身体利用葡萄糖的器官。');
  await expect(page.locator('#article-figure')).toContainText('图示边界：');
  await expect(page.locator('#article-figure')).toContainText('Servier Medical Art by Servier');
  await expect(page.locator('#article-figure')).toContainText('CC BY 4.0');
  await expect(page.locator('#article-figure .citations a').first()).toBeVisible();
  // Citation anchor targets exist for every figure source id.
  const citationHrefs = await page.locator('#article-figure .citations a').evaluateAll(links => links.map(link => link.getAttribute('href')));
  assert.ok(citationHrefs.length);
  for (const href of citationHrefs) {
    assert.ok(await page.locator(`css=${href}`).count(), `figure citation target missing: ${href}`);
  }
  // Reading TOC gains the figure anchor only when a figure exists.
  await expect(page.locator('.reading-toc a[href="#article-figure"]')).toBeVisible();
  // The image actually loads from /media.
  expect(await image.evaluate(img => img.naturalWidth > 0)).toBe(true);
  const fallback = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await fallback.route('**/media/pancreas-servier.png', route => route.fulfill({ status: 404, body: '' }));
  await fallback.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
  await expect(fallback.locator('#article-figure')).toContainText('图片暂时无法显示');
  await expect(fallback.locator('#article-figure')).toContainText('图示边界');
  await expect(fallback.locator('#article-source-panel')).toBeAttached();
  await fallback.close();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'figure must not overflow on mobile');
  if (screenshotDir) {
    await mkdir(screenshotDir, { recursive: true });
    await page.screenshot({ path: `${screenshotDir}/glucose-figure-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: `${screenshotDir}/glucose-figure-desktop.png`, fullPage: true });
  }
  await page.close();

  // No figure: the block and its TOC entry never render.
  const plain = await browser.newPage({ viewport: { width: 390, height: 844 } });
  plain.on('pageerror', error => errors.push(`plain: ${error.message}`));
  await plain.goto(`${base}/article/lipids`, { waitUntil: 'networkidle' });
  await expect(plain.locator('#article-figure')).toHaveCount(0);
  await expect(plain.locator('.reading-toc a[href="#article-figure"]')).toHaveCount(0);
  assert.ok(await plain.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no-figure page must not overflow');
  await plain.close();

  // No-JS SSR keeps the figure readable with text fallback intact.
  const noJSBase = process.env.SSR_PLAYWRIGHT_BASE_URL;
  if (noJSBase) {
    const noJS = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await noJS.goto(`${noJSBase}/article/glucose`);
    await expect(noJS.locator('#article-figure img')).toHaveAttribute('src', '/media/pancreas-servier.png');
    await expect(noJS.locator('#article-figure figcaption')).toContainText('胰腺');
    await expect(noJS.locator('#article-figure')).toContainText('图示边界：');
    await noJS.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS verified figure rendering with caption, source anchors and attribution; no-figure omission; mobile layout and no-JS SSR.');
} finally {
  await browser.close();
}
