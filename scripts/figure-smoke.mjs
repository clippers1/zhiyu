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

  // Long-form articles explain mechanisms with inline SVG diagrams: the labels
  // must use the page font, be selectable text, and stay legible at 320px.
  await expect(page.locator('svg.diagram')).toHaveCount(2);
  await expect(page.locator('#article-figure')).toBeVisible();
  await expect(page.locator('#article-figure-windows')).toBeVisible();
  await expect(page.locator('#article-figure')).toContainText('葡萄糖进入血液后的去向');
  await expect(page.locator('#article-figure')).toContainText('胰岛素');
  await expect(page.locator('#article-figure-windows')).toContainText('糖化血红蛋白');
  await expect(page.locator('#article-figure')).toContainText('图示边界：');
  await expect(page.locator('#article-figure')).toContainText('知愈自制示意图');
  // Both diagrams are labelled for assistive technology, not just visually.
  await expect(page.locator('svg.diagram[role="img"]')).toHaveCount(2);
  await expect(page.locator('svg.diagram title')).toHaveCount(2);
  // Screen readers get the full description, not just the visible labels.
  const desc = await page.locator('#article-figure svg desc').textContent();
  assert.ok(desc.includes('胰岛素') && desc.includes('肝脏'), 'diagram description must explain the mechanism');
  // Citation anchors from the figure exist in the source panel.
  const citationHrefs = await page.locator('#article-figure .citations a').evaluateAll(links => links.map(link => link.getAttribute('href')));
  assert.ok(citationHrefs.length);
  for (const href of citationHrefs) assert.ok(await page.locator(`css=${href}`).count(), `figure citation target missing: ${href}`);
  await expect(page.locator('.reading-toc a[href="#article-figure"]')).toBeVisible();

  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `diagram overflow at ${width}`);
    const box = await page.locator('svg.diagram').first().boundingBox();
    assert.ok(box && box.width <= width, `diagram wider than ${width}px viewport`);
  }
  if (screenshotDir) {
    await mkdir(screenshotDir, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#article-figure').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${screenshotDir}/glucose-diagram-mobile.png` });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.locator('#article-figure-windows').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${screenshotDir}/glucose-diagram-desktop.png` });
  }
  await page.close();

  // An article whose record carries no figure keeps the plain reading path.
  // This fixture replaces the fetched JSON in the browser; server-rendered
  // pages never read that path, so the case only applies to the static build.
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
    await expect(plain.locator('svg.diagram')).toHaveCount(0);
    await expect(plain.locator('.reading-toc a[href^="#article-figure"]')).toHaveCount(0);
    assert.ok(await plain.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no-figure page must not overflow');
    await plain.close();
  }

  if (ssr) {
    const noJS = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await noJS.goto(`${base}/article/glucose`);
    await expect(noJS.locator('svg.diagram')).toHaveCount(2);
    await expect(noJS.locator('#article-figure figcaption')).toContainText('葡萄糖进入血液后');
    await expect(noJS.locator('#article-figure')).toContainText('图示边界：');
    await noJS.close();
  } else {
    // A static PNG figure keeps its file path and the broken-image fallback.
    const detail = JSON.parse(await readFile('public/content/indicator/glucose.json', 'utf8'));
    const withFigure = {
      ...detail,
      figures: [{
        key: 'legacy', src: '/media/pancreas-servier.png', width: 936, height: 370,
        alt: '胰腺外形医学插图', caption: '胰腺：分泌胰岛素帮助身体利用葡萄糖的器官。',
        simplification: '图为胰腺外形示意，非真实比例。', sourceIds: ['insulin'],
        attribution: { name: 'Servier Medical Art by Servier', url: 'https://smart.servier.com/smart_image/pancreas-overview/', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
      }],
    };
    const pattern = '**/content/indicator/glucose.json';
    const fixture = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await fixture.route(pattern, route => route.fulfill({ json: withFigure }));
    await fixture.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
    await expect(fixture.locator('svg.diagram')).toHaveCount(0);
    await expect(fixture.locator('#article-figure img')).toHaveAttribute('src', '/media/pancreas-servier.png');
    await expect(fixture.locator('#article-figure')).toContainText('CC BY 4.0');
    await fixture.close();

    const broken = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await broken.route(pattern, route => route.fulfill({ json: withFigure }));
    await broken.route('**/media/pancreas-servier.png', route => route.fulfill({ status: 404, body: '' }));
    await broken.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
    await expect(broken.locator('#article-figure')).toContainText('图片暂时无法显示');
    await expect(broken.locator('#article-figure')).toContainText('图示边界');
    await expect(broken.locator('#article-source-panel')).toBeAttached();
    await broken.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS inline mechanism diagrams with description, citations and attribution; responsive legibility; no-figure omission; ' + (ssr ? 'no-JS SSR.' : 'PNG figure and broken-image fallback.'));
} finally {
  await browser.close();
}
