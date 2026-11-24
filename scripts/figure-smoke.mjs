import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
const screenshotDir = process.env.SCREENSHOT_DIR;
const ssr = process.env.TEST_SSR === 'true';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });

  // Long-form articles pair AI-generated WebP illustrations with structured
  // HTML legends, captions, citations and boundary notes.
  await expect(page.locator('.article-figure img')).toHaveCount(2);
  await expect(page.locator('#article-figure')).toBeVisible();
  await expect(page.locator('#article-figure-windows')).toBeVisible();
  await expect(page.locator('#article-figure')).toContainText('葡萄糖进入血液后');
  await expect(page.locator('#article-figure .figure-legend li')).toHaveCount(3);
  await expect(page.locator('#article-figure-windows')).toContainText('糖化血红蛋白');
  await expect(page.locator('#article-figure')).toContainText('图示边界：');
  await expect(page.locator('#article-figure')).toContainText('AI 生成插图');

  // Citation anchors from the figure exist in the source panel.
  const citationHrefs = await page.locator('#article-figure .citations a').evaluateAll(links => links.map(link => link.getAttribute('href')));
  assert.ok(citationHrefs.length);
  for (const href of citationHrefs) assert.ok(await page.locator(`css=${href}`).count(), `figure citation target missing: ${href}`);
  await expect(page.locator('.reading-toc a[href="#article-figure"]')).toBeVisible();

  const figureArticles = [
    'glucose', 'cbc', 'liver-function', 'kidney-function', 'lipids', 'pressure',
    'thyroid-function', 'uric-acid', 'urinalysis', 'stairs-heart', 'lab-range',
  ];
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `figure overflow at ${width}`);
  }

  await page.setViewportSize({ width: 320, height: 900 });
  for (const slug of figureArticles) {
    await page.goto(`${base}/article/${slug}`, { waitUntil: 'networkidle' });
    const locators = page.locator('.article-figure img');
    const count = await locators.count();
    assert.ok(count >= 1, `${slug}: expected at least one illustration`);
    for (let i = 0; i < count; i++) {
      const loc = locators.nth(i);
      await loc.scrollIntoViewIfNeeded();
      await expect.poll(() => loc.evaluate(node => node.complete && node.naturalWidth > 0), { timeout: 5000 }).toBe(true);
      const img = await loc.evaluate(node => ({ src: node.getAttribute('src'), alt: node.getAttribute('alt') }));
      assert.match(img.src || '', /^\/media\/fig-[a-z0-9-]+\.webp$/, `${slug}: expected WebP illustration`);
      assert.ok(img.alt && img.alt.length > 5, `${slug}: alt text required`);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${slug}: overflow at 320px`);
  }

  if (screenshotDir) {
    await mkdir(screenshotDir, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${screenshotDir}/home-mobile.png`, fullPage: true });
    await page.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${screenshotDir}/article-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${screenshotDir}/home-desktop.png` });
  }
  await page.close();

  // An article whose record carries no figure keeps the plain reading path.
  if (!ssr) {
    const plain = await browser.newPage({ viewport: { width: 390, height: 844 } });
    plain.on('pageerror', error => errors.push(`plain: ${error.message}`));
    const source = JSON.parse(await readFile('public/content/indicator/cbc.json', 'utf8'));
    const bare = {
      ...source,
      figures: [],
      sections: source.sections.map(({ figure, ...section }) => section),
    };
    await plain.route('**/content/indicator/cbc.json', route => route.fulfill({ json: bare }));
    await plain.goto(`${base}/article/cbc`, { waitUntil: 'networkidle' });
    await expect(plain.locator('.article-figure')).toHaveCount(0);
    await expect(plain.locator('.reading-toc a[href^="#article-figure"]')).toHaveCount(0);
    assert.ok(await plain.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no-figure page must not overflow');
    await plain.close();
  }

  if (ssr) {
    const noJS = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await noJS.goto(`${base}/article/glucose`);
    await expect(noJS.locator('.article-figure img')).toHaveCount(2);
    await expect(noJS.locator('#article-figure figcaption')).toContainText('葡萄糖进入血液后');
    await expect(noJS.locator('#article-figure')).toContainText('图示边界：');
    await noJS.close();
  } else {
    const broken = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await broken.route('**/media/fig-glucose-flow.webp', route => route.fulfill({ status: 404, body: '' }));
    await broken.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
    await expect(broken.locator('#article-figure')).toContainText('图片暂时无法显示');
    await expect(broken.locator('#article-figure')).toContainText('图示边界');
    await expect(broken.locator('#article-source-panel')).toBeAttached();
    await broken.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS AI-generated WebP illustrations, HTML legends, citations, attribution, 320px responsive check, no-figure omission and broken-image fallback.');
} finally {
  await browser.close();
}
