import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';

const base = process.env.PLAYWRIGHT_BASE_URL;
const credentialsPath = process.env.ADMIN_CREDENTIALS_FILE;
if (!base || !credentialsPath) throw new Error('Set PLAYWRIGHT_BASE_URL and a private ADMIN_CREDENTIALS_FILE.');
const values = Object.fromEntries((await readFile(credentialsPath, 'utf8')).trim().split('\n').map(line => {
  const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)];
}));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(`${base}/admin/login`, { waitUntil: 'networkidle' });
  await page.locator('input[name="email"]').fill(values.BOOTSTRAP_EMAIL);
  await page.locator('input[name="password"]').fill(values.BOOTSTRAP_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin\/?$/);
  await expect(page.locator('a[href="/admin/collections/articles"]').first()).toBeVisible();
  await page.goto(`${base}/admin/collections/articles`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('link', { name: '血糖', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '血糖', exact: true }).click();
  await expect(page.locator('input[name="title"]')).toHaveValue('血糖');
  await expect(page.locator('textarea[name="description"]')).toContainText('葡萄糖');
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/content-admin.png', fullPage: false });
  const result = await page.request.get(`${base}/api/cms/reviews?limit=1`, { headers: { Origin: new URL(base).origin } });
  assert.equal(result.status(), 200);
  assert.equal((await result.json()).totalDocs, 0, 'Production seed must not fabricate medical reviews');
  assert.deepEqual(errors, []);
  console.log('PASS admin browser login, content list/editor and no fabricated medical review records.');
} finally { await browser.close(); }
