import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await mkdir('artifacts', { recursive: true });
try {
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'artifacts/desktop.png', fullPage: true });
  await page.getByRole('button', { name: /01 血糖/ }).click();
  await page.getByRole('heading', { name: '认识血糖' }).waitFor();
  await page.getByRole('button', { name: '收藏知识' }).click();
  await page.getByRole('button', { name: '已收藏' }).waitFor();
  await page.keyboard.press('Escape');
  await page.reload();
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('zhiyu-saved'))), ['glucose']);
  await page.getByRole('button', { name: '搜索指标或器官', exact: true }).click();
  await page.getByRole('textbox').fill('LDL');
  await page.getByRole('button', { name: /指标 血脂/ }).click();
  await page.getByRole('heading', { name: '认识血脂' }).waitFor();
  await page.getByRole('button', { name: '探索器官', exact: true }).click();
  await page.getByRole('button', { name: '肝脏', exact: true }).waitFor();
  assert.equal(await page.locator('.organ-tabs .active').textContent(), '肝脏');
  await page.getByRole('button', { name: '了解肾脏', exact: true }).click();
  assert.equal(await page.locator('.organ-tabs .active').textContent(), '肾脏');
  await page.getByRole('button', { name: '健康地图', exact: true }).click();
  await page.getByRole('button', { name: '1 分钟认识身体' }).click();
  await page.getByRole('button', { name: '继续了解' }).click();
  await page.getByRole('button', { name: '继续了解' }).click();
  await page.getByRole('button', { name: '开始探索', exact: true }).click();
  assert.equal(await page.getByRole('dialog').count(), 0);
  await page.getByRole('button', { name: '健康地图', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/mobile.png', fullPage: true });
  for (const name of ['指标百科', '器官探索', '我的收藏', '健康地图']) {
    await page.getByRole('button', { name: '展开菜单' }).click();
    await page.locator('nav').getByRole('button', { name: new RegExp(name) }).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: horizontal overflow`);
  }
  await page.getByRole('button', { name: /02 血压/ }).click();
  await page.getByRole('heading', { name: '认识血压' }).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: 'artifacts/mobile-detail.png', fullPage: true });
  await page.getByRole('button', { name: '关闭弹窗' }).click();
  await page.getByRole('button', { name: '搜索指标或器官', exact: true }).click();
  await page.getByRole('textbox').fill('不存在的专题');
  await page.getByText('暂时没有这个专题。试试血糖、血压、血脂或器官名称。').waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: indicator details, persistent bookmarks, search, organ navigation, onboarding, mobile navigation and layout. No page errors.');
} finally {
  await browser.close();
}
