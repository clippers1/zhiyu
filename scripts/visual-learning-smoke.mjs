import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
const ssr = process.env.TEST_SSR === 'true';
const screenshotDir = process.env.SCREENSHOT_DIR;
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/organs/heart`, { waitUntil: 'networkidle' });
  const learning = page.locator('.visual-learning');
  await expect(learning).toContainText('跟着血液走一圈');
  await expect.poll(() => page.evaluate(async () => (await fetch('/media/heart-servier.png')).status)).toBe(200);
  await expect(page.locator('.organ-artwork-heart img')).toHaveAttribute('src', '/media/organ-heart.webp');
  if (screenshotDir) {
    await mkdir(screenshotDir, { recursive: true });
    await learning.screenshot({ path: `${screenshotDir}/heart-mobile.png` });
    await page.setViewportSize({ width: 1280, height: 900 });
    await learning.screenshot({ path: `${screenshotDir}/heart-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await expect(learning.locator('.learning-current')).toContainText('从全身回到右心房');
  await learning.getByRole('button', { name: /右心室：/ }).click();
  await expect(learning.locator('.learning-current')).toContainText('把血液经肺动脉泵向肺');
  await learning.getByRole('button', { name: '下一步' }).click();
  await expect(learning.locator('.learning-current')).toContainText('右心房到右心室');
  await learning.getByRole('button', { name: '逐步播放' }).click();
  await expect(learning.locator('.learning-current')).toContainText('右心室把血液送往肺', { timeout: 4000 });
  await learning.getByRole('button', { name: '暂停' }).click();
  await expect(learning.locator('.learning-check')).toHaveCount(0);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `visual learning overflows at ${width}px`);
  }
  await page.goto(`${base}/organs/lung`, { waitUntil: 'networkidle' });
  const lung = page.locator('.visual-learning');
  await expect(lung).toContainText('跟着一口气到肺泡');
  await expect(lung.locator('.lung-medical-diagram')).toHaveCount(1);
  await expect(lung.locator('.learning-path')).toHaveCount(1);
  await expect(lung.locator('.learning-path.active')).toHaveCount(1);
  await expect(lung.locator('marker[markerUnits="userSpaceOnUse"]')).toHaveCount(4);
  await expect(lung.locator('marker').first()).toHaveAttribute('markerWidth', '10');
  await expect.poll(() => page.evaluate(async () => Promise.all([
    '/media/lung-servier.png',
    '/media/alveoli-servier.png',
  ].map(async src => (await fetch(src)).status)))).toEqual([200, 200]);
  if (screenshotDir) {
    await lung.screenshot({ path: `${screenshotDir}/lung-mobile.png` });
    await page.setViewportSize({ width: 1280, height: 900 });
    await lung.screenshot({ path: `${screenshotDir}/lung-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await expect(lung.locator('.learning-current')).toContainText('空气从鼻或口进入气管');
  await lung.getByRole('button', { name: /毛细血管：/ }).click();
  await expect(lung.locator('.learning-current')).toContainText('氧气从肺泡进入周围毛细血管');
  await lung.getByRole('button', { name: '下一步' }).click();
  await expect(lung.locator('.learning-current')).toContainText('空气进入支气管');
  await expect(lung.locator('.learning-path')).toHaveCount(1);
  await expect(lung.locator('.learning-check')).toHaveCount(0);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `lung visual learning overflows at ${width}px`);
  }
  for (const [id, asset] of [
    ['liver', 'organ-liver.webp'],
    ['kidney', 'organ-kidney.webp'],
    ['pancreas', 'organ-pancreas.webp'],
  ]) {
    await page.goto(`${base}/organs/${id}`, { waitUntil: 'networkidle' });
    const artwork = page.locator(`.organ-artwork-${id}`);
    await expect(artwork.locator('img')).toHaveAttribute('src', `/media/${asset}`);
    await expect(artwork).toContainText('AI 生成插图');
    await expect.poll(() => page.evaluate(async src => (await fetch(src)).status, `/media/${asset}`)).toBe(200);
    if (screenshotDir) {
      await page.setViewportSize({ width: 390, height: 844 });
      await artwork.screenshot({ path: `${screenshotDir}/${id}-artwork-mobile.png` });
      await page.setViewportSize({ width: 1280, height: 900 });
      await artwork.screenshot({ path: `${screenshotDir}/${id}-artwork-desktop.png` });
    }
  }
  const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await reduced.goto(`${base}/organs/heart`, { waitUntil: 'networkidle' });
  await expect(reduced.getByRole('button', { name: '已减少动态' })).toBeDisabled();
  await reduced.getByRole('button', { name: '下一步' }).click();
  await expect(reduced.locator('.learning-current')).toContainText('右心房到右心室');
  await reduced.close();
  if (ssr) {
    const noJS = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await noJS.goto(`${base}/organs/heart`);
    await expect(noJS.locator('.learning-transcript')).toContainText('左心室把血液送向全身');
    await expect(noJS.locator('.learning-boundary')).toContainText('底图展示心脏剖面结构');
    await noJS.goto(`${base}/organs/lung`);
    await expect(noJS.locator('.learning-transcript')).toContainText('二氧化碳随呼气排出');
    await expect(noJS.locator('.learning-boundary')).toContainText('不按真实数量');
    await noJS.close();
  }
  if (!ssr) {
    const unavailable = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await unavailable.route('**/content/organ/heart.json', route => route.fulfill({ status: 404, json: { error: 'withdrawn' } }));
    await unavailable.goto(`${base}/organs/heart`, { waitUntil: 'networkidle' });
    await expect(unavailable.locator('.organ-artwork')).toHaveCount(0);
    await expect(unavailable.locator('.organ-information [role="alert"]')).toBeVisible();
    await unavailable.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS heart and lung learning steps, organic diagrams, structure selection, controls and responsive/reduced-motion${ssr ? ' plus no-JS transcripts' : ''}`);
} finally {
  await browser.close();
}
