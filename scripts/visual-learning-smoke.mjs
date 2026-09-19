import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
const ssr = process.env.TEST_SSR === 'true';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/organs/heart`, { waitUntil: 'networkidle' });
  const learning = page.locator('.visual-learning');
  await expect(learning).toContainText('跟着血液走一圈');
  await expect(learning.locator('.learning-current')).toContainText('从全身回到右心房');
  await learning.getByRole('button', { name: /右心室：/ }).click();
  await expect(learning.locator('.learning-current')).toContainText('把血液经肺动脉泵向肺');
  await learning.getByRole('button', { name: '下一步' }).click();
  await expect(learning.locator('.learning-current')).toContainText('右心房到右心室');
  await learning.getByRole('button', { name: '逐步播放' }).click();
  await expect(learning.locator('.learning-current')).toContainText('右心室把血液送往肺', { timeout: 4000 });
  await learning.getByRole('button', { name: '暂停' }).click();
  await learning.locator('.learning-check fieldset').first().getByRole('button', { name: '左心房' }).click();
  await expect(learning.locator('.learning-answer').first()).toContainText('再顺着路径看一遍');
  await learning.locator('.learning-check fieldset').first().getByRole('button', { name: '右心房' }).click();
  await expect(learning.locator('.learning-answer').first()).toContainText('理解正确');
  assert.equal(await page.evaluate(() => Object.keys(localStorage).some(key => key.includes('answer') || key.includes('quiz'))), false);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `visual learning overflows at ${width}px`);
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
    await expect(noJS.locator('.learning-boundary')).toContainText('不按真实大小');
    await noJS.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS heart flow steps, structure selection, controls, local-only quiz and responsive/reduced-motion${ssr ? ' plus no-JS transcript' : ''}`);
} finally {
  await browser.close();
}
