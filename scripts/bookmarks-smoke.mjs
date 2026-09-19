import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
const ssr = process.env.TEST_SSR === 'true';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('zhiyu-saved', JSON.stringify(['glucose', 'lipids', 'unavailable-topic'])));
  await page.goto(`${base}/saved`, { waitUntil: 'networkidle' });
  await expect(page.locator('.indicator-card')).toHaveCount(2);
  await expect(page.getByRole('button', { name: '指标（3）', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('1 条收藏暂不可用')).toBeVisible();
  await page.getByRole('textbox', { name: '筛选指标', exact: true }).fill('LDL-C');
  await expect(page.locator('.indicator-card')).toHaveCount(1);
  await expect(page.locator('.indicator-card')).toContainText('血脂');
  await page.getByRole('textbox', { name: '筛选指标', exact: true }).fill('pressure');
  await expect(page.getByRole('heading', { name: '暂时没有匹配的内容' })).toBeVisible();
  await page.getByRole('button', { name: '清除收藏筛选' }).click();
  await page.getByRole('button', { name: '移除血糖收藏' }).click();
  await expect(page.locator('.indicator-card')).toHaveCount(1);
  await page.getByRole('button', { name: '撤销移除' }).click();
  await expect(page.locator('.indicator-card')).toHaveCount(2);
  await page.getByRole('button', { name: '移除不可用收藏unavailable-topic' }).click();
  await expect(page.getByText('1 条收藏暂不可用')).toHaveCount(0);

  await page.goto(`${base}/organs/liver`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '收藏器官', exact: true }).click();
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: '已收藏器官', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto(`${base}/saved`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '器官（1）', exact: true }).click();
  await expect(page.locator('.saved-organ-card')).toHaveCount(1);
  await expect(page.locator('.saved-organ-card')).toContainText('肝脏');
  await page.getByRole('textbox', { name: '筛选收藏器官' }).fill('liver');
  await expect(page.locator('.saved-organ-card')).toHaveCount(1);
  await page.getByRole('button', { name: '清空器官收藏' }).click();
  await page.getByRole('button', { name: '保留收藏', exact: true }).click();
  await expect(page.locator('.saved-organ-card')).toHaveCount(1);

  const second = await context.newPage();
  await second.goto(`${base}/organs/liver`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '清空器官收藏' }).click();
  await page.getByRole('button', { name: '确认清空', exact: true }).click();
  await expect(second.getByRole('button', { name: '收藏器官', exact: true })).toBeVisible();
  await expect(page.locator('.saved-organ-card')).toHaveCount(0);
  await page.getByRole('button', { name: '指标（2）', exact: true }).click();
  await expect(page.locator('.indicator-card')).toHaveCount(2);
  await second.evaluate(() => localStorage.clear());
  await expect(page.locator('.indicator-card')).toHaveCount(0);
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.evaluate(() => localStorage.getItem('zhiyu-saved')), null, 'Reads never recreate cleared storage');
  await second.close();

  // >24 records must not mark the second page unavailable; >200 IDs must batch.
  await page.evaluate(() => localStorage.setItem('zhiyu-saved-organs', JSON.stringify(Array.from({ length: 205 }, (_, i) => `test-${i}`))));
  const pattern = ssr ? '**/api/demo/content?*' : '**/content/index.json';
  let fail = false;
  await page.route(pattern, async route => {
    if (fail) return route.abort();
    const items = Array.from({ length: 205 }, (_, i) => ({ kind: 'organ', id: `test-${i}`, title: `测试器官${i}`, subtitle: 'Synthetic fixture', tags: [], category: 'test', referenceCount: 0 }));
    if (!ssr) return route.fulfill({ json: { items, categories: [] } });
    const params = new URL(route.request().url()).searchParams;
    const allowed = (params.get('ids') || '').split(',');
    const filtered = items.filter(item => allowed.includes(item.id));
    const offset = Number(params.get('cursor') || 0), size = Number(params.get('limit') || 6);
    return route.fulfill({ json: { items: filtered.slice(offset, offset + size), total: filtered.length, categories: [], nextCursor: offset + size < filtered.length ? String(offset + size) : null } });
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '器官（205）', exact: true }).click();
  await expect(page.locator('.saved-organ-card')).toHaveCount(6);
  await expect(page.locator('.result-count')).toContainText('205');
  await expect(page.locator('.unavailable-saved h2')).toHaveCount(0);
  await page.getByRole('button', { name: '下一页' }).click();
  await expect(page.locator('.saved-organ-card').first()).toContainText('测试器官6');
  await page.getByRole('button', { name: '移除测试器官6收藏' }).click();
  await expect(page.locator('.saved-organ-card').first()).toContainText('测试器官0');
  fail = true;
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '器官（204）', exact: true }).click();
  await expect(page.locator('.unavailable-saved [role="alert"]')).toBeVisible();
  await expect(page.locator('.unavailable-saved h2')).toHaveCount(0);
  fail = false;
  await page.locator('.unavailable-saved').getByRole('button', { name: '重新加载' }).click();
  await expect(page.locator('.unavailable-saved [role="alert"]')).toHaveCount(0);
  await page.unroute(pattern);
  await page.evaluate(() => { localStorage.setItem('zhiyu-saved', '["glucose"]'); localStorage.setItem('zhiyu-saved-organs', '["liver"]'); });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: '器官（1）', exact: true }).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  const blocked = await browser.newPage();
  await blocked.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'QuotaExceededError'); }; });
  await blocked.goto(`${base}/organs/liver`, { waitUntil: 'networkidle' });
  await blocked.getByRole('button', { name: '收藏器官', exact: true }).click();
  await expect(blocked.locator('.bookmark-warning')).toBeVisible();
  await blocked.getByRole('button', { name: '已收藏器官', exact: true }).click();
  await expect(blocked.getByRole('button', { name: '收藏器官', exact: true })).toBeVisible();
  await blocked.close();
  if (ssr) {
    const noJS = await browser.newPage({ javaScriptEnabled: false });
    await noJS.goto(`${base}/saved`);
    await expect(noJS.locator('.saved-library noscript p')).toBeVisible();
    await expect(noJS.locator('.saved-library noscript p')).toHaveText('收藏保存在浏览器中，需要启用 JavaScript 后查看与管理。');
    await expect(noJS.locator('.saved-card')).toHaveCount(0);
    await expect(noJS.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await noJS.goto(`${base}/organs/liver`);
    await expect(noJS.getByRole('button', { name: '收藏器官', exact: true })).toBeDisabled();
    await noJS.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS legacy saves, organ saves, search, undo, unavailable records, confirmed clear, tab sync, 205-ID batching, pagination reset, failure/retry, storage failure and mobile layout');
} finally { await browser.close(); }
