import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { selectPage } from '../src/services/content.js';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174';
const live = process.env.FEEDBACK_LIVE === 'true';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
let receipt = '';
let submitted = null;
let attempts = 0;
let deleted = false;
try {
  if (!live) {
    const catalog = JSON.parse(await readFile('public/content/index.json', 'utf8'));
    await page.route('**/api/demo/content**', async route => {
      const url = new URL(route.request().url());
      const parts = url.pathname.split('/');
      if (parts.length === 6) {
        const content = JSON.parse(await readFile(`public/content/${parts[4]}/${parts[5]}.json`, 'utf8'));
        return route.fulfill({ json: { ...content, demo: true, releaseID: 1 } });
      }
      const options = Object.fromEntries(url.searchParams);
      if (options.ids !== undefined) options.ids = options.ids.split(',').filter(Boolean);
      await route.fulfill({ json: selectPage(catalog, options) });
    });
    await page.route('**/api/feedback/*', async route => {
      const action = new URL(route.request().url()).pathname.split('/').at(-1);
      const body = route.request().postDataJSON();
      assert.equal(route.request().method(), 'POST');
      assert.ok(!route.request().url().includes(body.receipt));
      if (action === 'submit') {
        attempts++;
        if (attempts === 1) {
          submitted = body;
          return route.fulfill({ status: 503, json: { error: 'service_unavailable' } });
        }
        assert.deepEqual(body, submitted, 'Network retry must preserve receipt and content version');
        return route.fulfill({ status: 201, json: { received: true } });
      }
      if (action === 'delete') { deleted = true; return route.fulfill({ json: { deleted: true } }); }
      if (deleted || body.receipt !== submitted.receipt) return route.fulfill({ status: 404, json: { error: 'not_found' } });
      await route.fulfill({ json: { status: 'triaging', contentTitle: '血糖', version: 1, publicReply: '<script>not executable</script> 编辑正在核查。', updatedAt: new Date().toISOString() } });
    });
  }
  await page.goto(`${base}/article/glucose`, { waitUntil: 'networkidle' });
  await page.locator('.feedback-panel summary').click();
  await page.getByLabel('问题类型', { exact: true }).selectOption('experience');
  await page.getByLabel(/具体问题/).fill('自动化验收用反馈：检查纠错提交与查询链路，不涉及医学结论，测试完成后删除。');
  await page.getByRole('checkbox', { name: /我理解这是内容纠错/ }).check();
  for (const width of [320, 360, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Expanded feedback form at ${width}px`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await mkdir('artifacts', { recursive: true });
  await page.locator('.feedback-panel').screenshot({ path: 'artifacts/feedback-mobile.png', style: '.reading-bar, .reading-actions { visibility: hidden !important; }' });
  await page.getByRole('button', { name: '提交给编辑', exact: true }).click();
  if (!live) {
    await expect(page.getByRole('alert')).toContainText('暂时不可用');
    await page.getByRole('button', { name: '重试提交', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: '反馈已收到，谢谢你的提醒。' })).toBeVisible();
  receipt = await page.getByLabel('专属查询码', { exact: true }).inputValue();
  assert.match(receipt, /^[a-f0-9]{64}$/);
  assert.ok(!page.url().includes(receipt));
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  assert.ok(!storage.includes(receipt));
  await expect(page.getByLabel(/具体问题/)).toHaveCount(0);

  // In live mode, verify that an actual CMS editor response reaches the reader.
  if (live && process.env.ADMIN_CREDENTIALS_FILE) {
    const values = Object.fromEntries((await readFile(process.env.ADMIN_CREDENTIALS_FILE, 'utf8')).trim().split('\n').map(line => {
      const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)];
    }));
    const admin = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await admin.goto(`${base}/admin/login`, { waitUntil: 'networkidle' });
    await admin.locator('input[name="email"]').fill(values.BOOTSTRAP_EMAIL);
    await admin.locator('input[name="password"]').fill(values.BOOTSTRAP_PASSWORD);
    await admin.locator('button[type="submit"]').click();
    await expect(admin).toHaveURL(/\/admin\/?$/);
    await expect(admin.getByRole('heading', { name: '内容维护待办' })).toBeVisible();
    await expect(admin.getByRole('link', { name: /尚未安排复核/ })).toBeVisible();
    await admin.screenshot({ path: 'artifacts/maintenance-admin.png' });
    await admin.getByRole('link', { name: /待处理读者纠错/ }).click();
    await expect(admin.getByRole('link', { name: '血糖', exact: true }).first()).toBeVisible();
    // Resolve the exact synthetic ticket, never edit a real reader's feedback.
    const query = new URLSearchParams({ 'where[message][equals]': '自动化验收用反馈：检查纠错提交与查询链路，不涉及医学结论，测试完成后删除。', sort: '-id', limit: '1', depth: '0' });
    const ticketsResponse = await admin.request.get(`${base}/api/cms/feedback?${query}`, { headers: { Origin: new URL(base).origin } });
    assert.equal(ticketsResponse.status(), 200);
    const ticket = (await ticketsResponse.json()).docs[0];
    assert.ok(ticket); assert.equal(ticket.receiptHash, undefined);
    await admin.goto(`${base}/admin/collections/feedback/${ticket.id}`, { waitUntil: 'networkidle' });
    await expect(admin.locator('textarea[name="message"]')).toHaveValue('自动化验收用反馈：检查纠错提交与查询链路，不涉及医学结论，测试完成后删除。');
    await admin.locator('textarea[name="publicReply"]').fill('自动化链路验证已完成，不代表医学审校。此测试反馈即将删除。');
    await admin.locator('textarea[name="internalNotes"]').fill('INTERNAL_SYNTHETIC_NOTE_DO_NOT_EXPOSE');
    const saved = admin.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname === `/api/cms/feedback/${ticket.id}`);
    await admin.locator('#action-save').click();
    assert.equal((await saved).status(), 200);
    await admin.close();
  }
  await page.getByRole('button', { name: '查询纠错进度', exact: true }).click();
  await page.getByRole('textbox', { name: '查询码', exact: true }).fill(receipt);
  await page.getByRole('button', { name: '查询处理结果', exact: true }).click();
  await expect(page.locator('.feedback-result')).toContainText('血糖');
  if (live && process.env.ADMIN_CREDENTIALS_FILE) await expect(page.locator('.feedback-result')).toContainText('自动化链路验证已完成');
  if (!live) await expect(page.locator('.feedback-result')).toContainText('<script>not executable</script>');
  await expect(page.locator('.feedback-result')).not.toContainText('INTERNAL_SYNTHETIC_NOTE_DO_NOT_EXPOSE');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByRole('button', { name: '删除这条反馈', exact: true }).click();
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('反馈已删除');
  deleted = true;
  await page.getByRole('button', { name: '查询处理结果', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('未找到反馈');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '查询纠错进度', exact: true })).toBeFocused();
  await page.goto(`${base}/organs/liver`, { waitUntil: 'networkidle' });
  await expect(page.locator('.feedback-panel')).toBeAttached();
  assert.deepEqual(errors, []);
  console.log(`PASS ${live ? 'live' : 'mocked'} reader feedback, ${live ? 'CMS reply, ' : 'retry identity, '}receipt-only lookup/deletion, privacy and mobile layout.`);
} finally {
  if (live && receipt && !deleted) {
    // Best-effort cleanup using only the code of the test's own ticket.
    const response = await page.request.post(`${base}/api/feedback/delete`, { headers: { Origin: new URL(base).origin }, data: { receipt } });
    console.log(`Synthetic feedback cleanup HTTP ${response.status()}`);
  }
  await browser.close();
}
