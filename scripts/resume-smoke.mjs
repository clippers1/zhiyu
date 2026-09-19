import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
const key = 'zhiyu-reading-v1';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const stored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const point = async (kind, id) => (await stored())?.entries.find(entry => entry.kind === kind && entry.id === id)?.position;
const scroll = section => page.locator(`#${section}`).evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
try {
  await page.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
  await scroll('article-metrics');
  await page.waitForTimeout(500);
  assert.equal(await stored(), null, 'Scrolling before opt-in must not write history');
  await page.goto(`${base}/saved`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '开启本地阅读记录' }).click();
  await page.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
  assert.equal(await point('indicator', 'glucose'), undefined);
  await scroll('article-metrics');
  await expect.poll(async () => (await point('indicator', 'glucose'))?.section).toBe('article-metrics');
  const savedPoint = await point('indicator', 'glucose');
  assert.deepEqual(Object.keys(savedPoint).sort(), ['revision', 'section']);
  await page.goto(base, { waitUntil: 'networkidle' });
  await expect(page.getByRole('region', { name: '接着上次阅读' })).toContainText('指标说明');
  await page.getByRole('link', { name: '继续了解血糖', exact: true }).click();
  await expect(page.getByRole('button', { name: '继续上次阅读', exact: true })).toBeVisible();
  assert.ok(await page.evaluate(() => scrollY < 250), 'Opening an article must not automatically restore the old position');
  await page.getByRole('button', { name: '继续上次阅读', exact: true }).click();
  await expect(page.locator('#article-metrics')).toBeInViewport();
  await expect(page.locator('#article-metrics')).toBeFocused();
  await page.locator('#article-process').evaluate(node => {
    node.scrollIntoView({ block: 'start', behavior: 'instant' });
    window.dispatchEvent(new Event('scroll'));
  });
  await page.goto(base, { waitUntil: 'networkidle' });
  assert.equal((await point('indicator', 'glucose')).section, 'article-process', 'Page departure flushes a pending position');

  // An explicit source link remains authoritative, even with an older position.
  await page.goto(`${base}/article/glucose#article-source-panel`, { waitUntil: 'networkidle' });
  await expect(page.locator('#article-source-panel')).toBeInViewport();
  await expect.poll(async () => (await point('indicator', 'glucose'))?.section).toBe('article-source-panel');
  await page.goto(`${base}/organs/liver`, { waitUntil: 'networkidle' });
  await scroll('organ-source-panel');
  await expect.poll(async () => (await point('organ', 'liver'))?.section).toBe('organ-source-panel');
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: '继续了解肝脏', exact: true }).click();
  await page.getByRole('button', { name: '继续上次阅读', exact: true }).click();
  await expect(page.locator('#organ-source-panel')).toBeInViewport();

  // A mismatched revision cannot produce a restore button or stale anchor jump.
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(key => {
    const value = JSON.parse(localStorage.getItem(key));
    value.entries.find(entry => entry.kind === 'organ' && entry.id === 'liver').position.revision = 'release:outdated';
    localStorage.setItem(key, JSON.stringify(value));
  }, key);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('link', { name: '继续了解肝脏', exact: true }).click();
  await expect(page.locator('.resume-reading')).toContainText('内容版本已更新');
  await expect(page.getByRole('button', { name: '继续上次阅读', exact: true })).toHaveCount(0);
  assert.equal(await point('organ', 'liver'), undefined);
  await page.getByRole('button', { name: '知道了，从新版开始' }).click();
  await scroll('organ-source-panel');
  await expect.poll(async () => (await point('organ', 'liver'))?.section).toBe('organ-source-panel');

  // Another tab clearing or disabling history invalidates all pending scroll saves.
  const second = await context.newPage();
  await second.goto(`${base}/organs/liver`, { waitUntil: 'networkidle' });
  await scroll('organ-overview');
  await page.waitForTimeout(550);
  assert.equal((await point('organ', 'liver')).section, 'organ-source-panel', 'An older tab cannot overwrite a newer visit');
  await second.goto(`${base}/saved`, { waitUntil: 'networkidle' });
  await scroll('organ-overview');
  await second.getByRole('button', { name: '清空阅读记录', exact: true }).click();
  await page.waitForTimeout(550);
  assert.deepEqual((await stored()).entries, []);
  await scroll('organ-source-panel');
  await page.waitForTimeout(550);
  assert.deepEqual((await stored()).entries, []);
  await second.getByRole('button', { name: '关闭并清除记录' }).click();
  await page.reload({ waitUntil: 'networkidle' });
  await scroll('organ-source-panel');
  await page.waitForTimeout(500);
  assert.deepEqual((await stored()).entries, []);
  await second.evaluate(() => localStorage.clear());
  await scroll('organ-overview');
  await page.waitForTimeout(500);
  assert.equal(await stored(), null);
  await second.close();

  // No automatic opt-in or stored titles; withdrawn latest items are skipped.
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ enabled: true, entries: [
    { kind: 'indicator', id: 'unavailable-topic', at: Date.now() },
    { kind: 'indicator', id: 'glucose', at: Date.now() - 1, position: { section: 'article-metrics', revision: 'old' } },
  ] })), key);
  await page.goto(base, { waitUntil: 'networkidle' });
  await expect(page.getByRole('link', { name: '继续了解血糖', exact: true })).toBeVisible();
  await page.goto(`${base}/saved`, { waitUntil: 'networkidle' });
  await expect(page.locator('.recent-list')).toContainText('上次：指标说明');
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
    await scroll('article-metrics');
    await expect.poll(async () => (await point('indicator', 'glucose'))?.section).toBe('article-metrics');
    await page.goto(base, { waitUntil: 'networkidle' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.getByRole('link', { name: '继续了解血糖', exact: true }).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.getByRole('button', { name: '继续上次阅读', exact: true }).click();
    await expect(page.locator('#article-metrics')).toBeInViewport();
  }
  if (process.env.TEST_SSR === 'true') {
    const noJS = await browser.newPage({ javaScriptEnabled: false });
    await noJS.goto(base);
    await expect(noJS.locator('.continue-card')).toHaveCount(0);
    await noJS.goto(`${base}/article/glucose`);
    await expect(noJS.locator('.resume-reading')).toHaveCount(0);
    await noJS.getByRole('link', { name: '核对来源', exact: true }).click();
    await expect(noJS.locator('#article-source-panel')).toBeInViewport();
    await noJS.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS opt-in section memory, explicit resume/focus, homepage continuation, organ positions, source anchors, revision invalidation, cross-tab clear/disable, unavailable entries and responsive layouts');
} finally { await browser.close(); }
