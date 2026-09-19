import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { READING_REACTIONS } from '../src/services/reading-feedback.js';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
const ssr = process.env.TEST_SSR === 'true';
const live = process.env.READING_FEEDBACK_LIVE === 'true';
if (live && (!ssr || !['localhost', '127.0.0.1'].includes(new URL(base).hostname) || new URL(base).port !== '3110')) {
  throw new Error('Live feedback tests may only write to the isolated preview on localhost:3110.');
}
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
let liveReceipt = '';
try {
  const content = ssr ? await (await page.request.get(`${base}/api/demo/content/indicator/glucose`)).json()
    : JSON.parse(await readFile('public/content/indicator/glucose.json', 'utf8'));
  await page.goto(`${base}/article/glucose?private=not-a-feedback-field`, { waitUntil: 'networkidle' });
  const quick = page.locator('.quick-read');
  await expect(quick).toContainText(content.desc);
  await expect(quick).toContainText(content.tip);
  await expect(quick).toContainText('来源与表达待完整核对');
  await expect(page.locator('.term-questions details')).toHaveCount(content.metrics.length);
  for (const [index, metric] of content.metrics.entries()) {
    const question = page.locator('.term-questions details').nth(index);
    await question.locator('summary').click();
    await expect(question.locator('p')).toContainText(metric.text);
    await expect(question.locator('.citations a').first()).toHaveAttribute('href', `#article-source-${metric.sourceIds[0]}`);
  }
  await page.locator('.term-questions .citations a').first().click();
  await expect(page.locator('#article-source-tests')).toBeInViewport();
  await page.getByRole('button', { name: '大字号', exact: true }).click();
  await expect(quick.locator('p').first()).toHaveCSS('font-size', '18px');
  await page.getByRole('button', { name: '大字号', exact: true }).click();
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await mkdir('artifacts', { recursive: true });
  await quick.screenshot({ path: 'artifacts/reading-guide-mobile.png', style: '.reading-bar,.reading-actions { visibility: hidden !important; }' });

  const panel = page.locator('.reading-feedback');
  if (!ssr) {
    await expect(panel).toContainText('离线演示');
    await expect(panel.getByRole('radio')).toHaveCount(0);
  } else {
    let submitted;
    let attempts = 0;
    let deleted = false;
    let failure = '';
    if (!live) await page.route('**/api/feedback/*', async route => {
      const body = route.request().postDataJSON();
      const action = new URL(route.request().url()).pathname.split('/').at(-1);
      assert.ok(!route.request().url().includes(body.receipt));
      if (action === 'submit') {
        attempts++;
        if (failure) return route.fulfill({ status: failure === 'rate_limited' ? 429 : failure === 'content_unavailable' ? 404 : 409,
          headers: { 'Retry-After': '90' }, json: { error: failure } });
        if (attempts === 1) { submitted = body; return route.abort(); }
        assert.deepEqual(body, submitted, 'Retry must keep the complete original request');
        return route.fulfill({ status: 201, json: { received: true } });
      }
      if (action === 'delete') { deleted = true; return route.fulfill({ json: { deleted: true } }); }
      if (deleted) return route.fulfill({ status: 404, json: { error: 'not_found' } });
      return route.fulfill({ json: { status: 'new', contentTitle: '血糖', version: content.releaseID, updatedAt: '2026-09-19' } });
    });
    await expect(panel.getByRole('button', { name: '提交阅读反馈' })).toBeDisabled();
    await panel.getByRole('radio', { name: '仍没看懂', exact: true }).check();
    await expect(panel.getByRole('button', { name: '提交阅读反馈' })).toBeDisabled();
    if (!live) assert.equal(attempts, 0, 'Choosing an option must not send a request');
    await panel.getByRole('checkbox').check();
    await panel.getByRole('button', { name: '提交阅读反馈' }).click();
    if (!live) {
      await expect(panel.getByRole('alert')).toContainText('保留查询码');
      await expect(panel.getByRole('radio').first()).toBeDisabled();
      await panel.getByRole('button', { name: '重试相同反馈' }).click();
    }
    await expect(panel.getByRole('status')).toContainText('阅读反馈已收到');
    const receipt = await panel.getByLabel('专属查询码', { exact: true }).inputValue();
    if (live) liveReceipt = receipt;
    else {
      assert.equal(submitted.releaseID, content.releaseID);
      assert.equal(submitted.message, READING_REACTIONS.find(item => item.id === 'unclear').message);
      assert.ok(!JSON.stringify(submitted).includes('private'));
    }
    assert.match(receipt, /^[a-f0-9]{64}$/);
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Receipt layout must not overflow');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(!await page.evaluate(value => JSON.stringify({ ...localStorage, ...sessionStorage }).includes(value), receipt));
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('zhiyu-reading-v1') || '{}').enabled), false);
    await page.getByRole('button', { name: '查询纠错进度', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: '查询码', exact: true }).fill(receipt);
    await dialog.getByRole('button', { name: '查询处理结果', exact: true }).click();
    await expect(dialog.locator('.feedback-result')).toContainText('血糖');
    await dialog.getByRole('button', { name: '删除这条反馈', exact: true }).click();
    await dialog.getByRole('button', { name: '确认删除', exact: true }).click();
    await expect(dialog.getByRole('status')).toContainText('反馈已删除');
    liveReceipt = '';
    await page.keyboard.press('Escape');
    if (!live) {
      for (const [code, message] of [['content_changed', '已更新'], ['content_unavailable', '已下线'], ['rate_limited', '2 分钟']]) {
        failure = code;
        await page.reload({ waitUntil: 'networkidle' });
        await panel.getByRole('radio', { name: '有帮助', exact: true }).check();
        await panel.getByRole('checkbox').check();
        await panel.getByRole('button', { name: '提交阅读反馈' }).click();
        await expect(panel.getByRole('alert')).toContainText(message);
        await expect(panel.getByRole('status')).toHaveCount(0);
      }
    }
    await page.goto(`${base}/organs/liver`, { waitUntil: 'networkidle' });
    await expect(panel.getByRole('radio', { name: '有帮助', exact: true })).not.toBeChecked();
    await expect(panel.getByLabel('专属查询码', { exact: true })).toHaveCount(0);
    const noJS = await browser.newPage({ javaScriptEnabled: false });
    await noJS.goto(`${base}/article/glucose`);
    await expect(noJS.locator('.quick-read')).toContainText(content.desc);
    const question = noJS.locator('.term-questions details').first();
    await question.locator('summary').click();
    await expect(question.locator('p')).toBeVisible();
    await question.locator('.citations a').first().click();
    await expect(noJS.locator('#article-source-tests')).toBeInViewport();
    await expect(noJS.locator('.reading-feedback').getByRole('button', { name: '提交阅读反馈' })).toBeDisabled();
    await noJS.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS verbatim layered reading/citations, native questions, large text and responsive layouts; ${ssr ? `${live ? 'isolated live' : 'mocked'} consent/version-bound feedback, receipt deletion and no-JS reading` : 'offline feedback disabled'}`);
} finally {
  if (liveReceipt) await page.request.post(`${base}/api/feedback/delete`, { headers: { Origin: new URL(base).origin }, data: { receipt: liveReceipt } });
  await browser.close();
}
