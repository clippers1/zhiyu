import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
const screenshotDir = process.env.SCREENSHOT_DIR;
const ssr = process.env.TEST_SSR === 'true';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const errors = [];

// Every figure label must stay legible at the narrowest phone and inside the
// canvas. Same rule as figure-smoke, applied here because /guide is not an
// article and the article loop cannot reach it.
async function assertFigureType(page, where) {
  const labels = await page.evaluate(() => [...document.querySelectorAll('svg.diagram')].flatMap(svg => {
    const viewBox = svg.viewBox.baseVal;
    const scale = svg.getBoundingClientRect().width / viewBox.width;
    return [...svg.querySelectorAll('text')].map(node => {
      const box = node.getBBox();
      return {
        text: node.textContent,
        px: Number((Number.parseFloat(getComputedStyle(node).fontSize) * scale).toFixed(2)),
        right: box.x + box.width,
        limit: viewBox.width,
      };
    });
  }));
  assert.ok(labels.length, `${where}: expected at least one diagram label`);
  for (const label of labels) {
    assert.ok(label.px >= 10, `${where}: "${label.text}" renders at ${label.px}px at 320px`);
    assert.ok(label.right <= label.limit + 1, `${where}: "${label.text}" overflows the canvas`);
  }
}

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', error => errors.push(error.message));

  // The entry sits on the home page, right under search — the moment a reader
  // is holding a report and does not know which column to look at.
  await page.goto(base, { waitUntil: 'networkidle' });
  const entry = page.locator('.home-report-guide');
  await expect(entry).toHaveCount(1);
  await expect(entry).toHaveAttribute('href', '/guide');
  await expect(entry).toContainText('单子怎么读');

  await entry.click();
  await expect(page).toHaveURL(/\/guide$/);
  if (!ssr) await expect(page).toHaveTitle(/单子怎么读 · 知愈/);
  await expect(page.getByRole('heading', { name: '先看卡片上这一行。', exact: true })).toBeVisible();
  await expect(page.locator('.guide-figure svg.diagram')).toBeVisible();
  await expect(page.locator('svg.diagram[role="img"] title')).toHaveCount(1);
  await expect(page.locator('svg.diagram desc')).toContainText('参考区间');
  await expect(page.locator('.guide-legend li')).toHaveCount(4);
  await expect(page.locator('.article-section')).toHaveCount(5);
  await expect(page.locator('.guide-rows-item')).toHaveCount(9);
  await expect(page.locator('.source-list li')).toHaveCount(3);
  await expect(page.locator('#guide-source-panel')).toContainText('How to Understand Your Lab Results');
  // The guide must not borrow an unloaded-state placeholder: it is static.
  await expect(page.locator('.load-state')).toHaveCount(0);
  // FAQ answers stay inside the page, not in a generated dialog.
  await page.getByRole('group').first().locator('summary').first().click();

  // Every indicator article names its report rows, and the strip links back.
  for (const [slug, count] of [['glucose', 4], ['liver-function', 4], ['urinalysis', 4], ['uric-acid', 1]]) {
    await page.goto(`${base}/article/${slug}`, { waitUntil: 'networkidle' });
    const strip = page.locator('#article-report-rows');
    await expect(strip).toBeVisible();
    await expect(strip.locator('li')).toHaveCount(count);
    await expect(strip.getByRole('link', { name: /单子怎么读/ })).toHaveAttribute('href', '/guide');
    await expect(page.locator('.reading-toc a[href="#article-report-rows"]')).toBeVisible();
  }
  // A story is not an indicator: it must not claim a report row.
  await page.goto(`${base}/article/stairs-heart`, { waitUntil: 'networkidle' });
  await expect(page.locator('#article-report-rows')).toHaveCount(0);
  await expect(page.locator('.reading-toc a[href="#article-report-rows"]')).toHaveCount(0);

  // The strip navigates in-app rather than reloading the document.
  await page.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
  await page.locator('#article-report-rows').getByRole('link', { name: /单子怎么读/ }).click();
  await expect(page).toHaveURL(/\/guide$/);
  await expect(page.getByRole('heading', { name: '先看卡片上这一行。', exact: true })).toBeVisible();

  // A catalog outage still leaves the guide reachable: it is static content.
  if (!ssr) {
    const offline = await browser.newPage({ viewport: { width: 390, height: 844 } });
    offline.on('pageerror', error => errors.push(`offline: ${error.message}`));
    await offline.route('**/content/index.json', route => route.fulfill({ json: { schemaVersion: 1, categories: [], items: [] } }));
    await offline.goto(base, { waitUntil: 'networkidle' });
    await expect(offline.locator('.home-report-guide')).toHaveCount(1);
    await expect(offline.locator('.home-feature')).toHaveCount(0);
    await offline.locator('.home-report-guide').click();
    await expect(offline.getByRole('heading', { name: '先看卡片上这一行。', exact: true })).toBeVisible();
    await offline.close();
  }

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/guide`, { waitUntil: 'networkidle' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `guide overflow at ${width}`);
    if (width === 320) await assertFigureType(page, '/guide');
    await page.goto(`${base}/article/liver-function`, { waitUntil: 'networkidle' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `article strip overflow at ${width}`);
  }

  if (screenshotDir) {
    await mkdir(screenshotDir, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/guide`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${screenshotDir}/report-guide-mobile.png`, fullPage: true });
  }

  assert.deepEqual(errors, []);
  console.log('PASS report guide entry, annotated report figure, sourced guide copy, per-indicator report rows, 320px legibility and no-JS availability.');
} finally {
  await browser.close();
}
