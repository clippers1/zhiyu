import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:5174";
const screenshotDir = process.env.SCREENSHOT_DIR;
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
});
const errors = [];

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const loadedScripts = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", req => {
    if (req.resourceType() === "script") loadedScripts.push(req.url());
  });

  // 1. Homepage must NOT load Three.js on initial paint.
  await page.goto(base, { waitUntil: "networkidle" });
  assert.ok(
    !loadedScripts.some(url => /three/i.test(url)),
    `Homepage should not load three chunk eagerly: ${loadedScripts.join(", ")}`,
  );

  // 2. Organ 3D sandbox switch on heart & kidney
  for (const [slug, shotName] of [
    ["heart", "three-heart-3d.png"],
    ["kidney", "three-kidney-3d.png"],
    ["lung", "three-lung-3d.png"],
    ["thyroid", "three-thyroid-3d.png"],
  ]) {
    await page.goto(`${base}/organs/${slug}`, { waitUntil: "networkidle" });
    const learning = page.locator("#organ-learning");
    await learning.scrollIntoViewIfNeeded();
    await learning.getByRole("button", { name: /3D 互动沙盘/ }).click();
    const canvas = learning.locator(".three-stage-canvas");
    await expect(canvas).toBeVisible({ timeout: 15000 });
    const box = await canvas.boundingBox();
    assert.ok(box && box.width >= 240 && box.height >= 240, `${slug}: 3D canvas has invalid size`);
    await learning.getByRole("button", { name: "下一步" }).click();
    await learning.getByRole("button", { name: "重置 3D 视角" }).click();
    if (screenshotDir) {
      await mkdir(screenshotDir, { recursive: true });
      await page.waitForTimeout(350);
      await learning.screenshot({ path: `${screenshotDir}/${shotName}` });
    }
    await learning.getByRole("button", { name: /2D 原理图/ }).click();
    await expect(learning.locator(".three-stage-canvas")).toHaveCount(0);
  }

  // 3. 3D Body Map on organ page
  await page.goto(`${base}/organs/thyroid`, { waitUntil: "networkidle" });
  const bodyMap = page.locator("#organ-body-map");
  await bodyMap.scrollIntoViewIfNeeded();
  await bodyMap.getByRole("button", { name: /展开 3D 人体位置图/ }).click();
  await expect(bodyMap.locator(".three-stage-canvas")).toBeVisible({ timeout: 15000 });
  await bodyMap.getByRole("button", { name: "肝脏", exact: true }).click();
  await expect(bodyMap.locator(".body-map-info h3")).toHaveText("肝脏");
  if (screenshotDir) {
    await page.waitForTimeout(350);
    await bodyMap.screenshot({ path: `${screenshotDir}/three-body-map.png` });
  }

  // 4. Three high-spatial concept slices inside articles
  for (const [slug, secondMode, shotName] of [
    ["lung-nodule", "部分实性（混合型）", "three-lung-nodule.png"],
    ["bone-density", "稀疏多孔支架", "three-bone-density.png"],
    ["carotid-ultrasound", "局部斑块隆起", "three-carotid-plaque.png"],
  ]) {
    await page.goto(`${base}/article/${slug}`, { waitUntil: "networkidle" });
    const box = page.locator("#article-concept-3d");
    await box.scrollIntoViewIfNeeded();
    await expect(box.locator(".three-stage-canvas")).toHaveCount(0);
    await box.getByRole("button", { name: /打开 3D 观察/ }).click();
    await expect(box.locator(".three-stage-canvas")).toBeVisible({ timeout: 15000 });
    await box.getByRole("button", { name: secondMode, exact: true }).click();
    if (screenshotDir) {
      await page.waitForTimeout(350);
      await box.screenshot({ path: `${screenshotDir}/${shotName}` });
    }
  }

  // 5. Mobile 320px/390px overflow safety check with 3D open
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${base}/article/lung-nodule`, { waitUntil: "networkidle" });
    await page.locator("#article-concept-3d").getByRole("button", { name: /打开 3D 观察/ }).click();
    await expect(page.locator("#article-concept-3d .three-stage-canvas")).toBeVisible({ timeout: 15000 });
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `3D slice overflow at ${width}px`,
    );
  }

  assert.deepEqual(errors, []);
  console.log("PASS Three.js lazy loading (zero homepage chunk), 4 organ 3D sandboxes, 3D body map, 3 article concept slices and 320px responsive layout.");
} finally {
  await browser.close();
}
