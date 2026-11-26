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
  const failedModels = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", req => {
    if (req.resourceType() === "script") loadedScripts.push(req.url());
  });
  page.on("response", res => {
    if (/\/media\/models\/.+\.glb/i.test(res.url()) && res.status() >= 400) {
      failedModels.push(`${res.status()} ${res.url()}`);
    }
  });

  // 1. Homepage must NOT load Three.js on initial paint.
  await page.goto(base, { waitUntil: "networkidle" });
  assert.ok(
    !loadedScripts.some(url => /three/i.test(url)),
    `Homepage should not load three chunk eagerly: ${loadedScripts.join(", ")}`,
  );

  // 2. Organ 3D sandbox switch on ALL 6 organs!
  for (const [slug, shotName] of [
    ["heart", "three-heart-3d.png"],
    ["kidney", "three-kidney-3d.png"],
    ["lung", "three-lung-3d.png"],
    ["thyroid", "three-thyroid-3d.png"],
    ["liver", "three-liver-3d.png"],
    ["pancreas", "three-pancreas-3d.png"],
  ]) {
    await page.goto(`${base}/organs/${slug}`, { waitUntil: "networkidle" });
    const learning = page.locator("#organ-learning");
    await learning.scrollIntoViewIfNeeded();
    await learning.getByRole("button", { name: /3D 互动沙盘/ }).click();
    const canvas = learning.locator(".three-stage-canvas");
    await expect(canvas).toBeVisible({ timeout: 15000 });
    await expect(learning.locator(".three-stage-loading")).toHaveCount(0, { timeout: 15000 });
    await expect(learning.locator(".three-stage-attribution")).toContainText("NIH HuBMAP");
    const box = await canvas.boundingBox();
    assert.ok(box && box.width >= 240 && box.height >= 240, `${slug}: 3D canvas has invalid size`);
    await learning.getByRole("button", { name: "下一步" }).click();
    await learning.getByRole("button", { name: "重置 3D 视角" }).click();
    if (screenshotDir) {
      await mkdir(screenshotDir, { recursive: true });
      await page.waitForTimeout(550);
      await learning.screenshot({ path: `${screenshotDir}/${shotName}` });
    }
    await learning.getByRole("button", { name: /2D 原理图/ }).click();
    await expect(learning.locator(".three-stage-canvas")).toHaveCount(0);
  }

  // 3. 3D Body Map on organ page (real NIH HuBMAP torso + 6 organs + callout pin)
  await page.goto(`${base}/organs/thyroid`, { waitUntil: "networkidle" });
  const bodyMap = page.locator("#organ-body-map");
  await bodyMap.scrollIntoViewIfNeeded();
  await bodyMap.getByRole("button", { name: /展开 3D 人体位置图/ }).click();
  await expect(bodyMap.locator(".three-stage-canvas")).toBeVisible({ timeout: 15000 });
  await expect(bodyMap.locator(".three-stage-loading")).toHaveCount(0, { timeout: 15000 });
  await expect(bodyMap.locator(".three-stage-attribution")).toContainText("NIH HuBMAP");
  await expect(bodyMap.locator(".three-pin")).toBeVisible({ timeout: 10000 });
  if (screenshotDir) {
    await page.waitForTimeout(600);
    await bodyMap.screenshot({ path: `${screenshotDir}/three-body-map-overview.png` });
  }
  await bodyMap.getByRole("button", { name: "肝脏", exact: true }).click();
  await expect(bodyMap.locator(".body-map-info h3")).toHaveText("肝脏");
  if (screenshotDir) {
    await page.waitForTimeout(750);
    await bodyMap.screenshot({ path: `${screenshotDir}/three-body-map.png` });
  }

  // 4. Three high-spatial concept slices + interactive indicator flowchart on articles
  for (const [slug, secondMode, shotName] of [
    ["lung-nodule", "部分实性（混合型）", "three-lung-nodule.png"],
    ["bone-density", "稀疏多孔支架", "three-bone-density.png"],
    ["carotid-ultrasound", "局部斑块隆起", "three-carotid-plaque.png"],
  ]) {
    await page.goto(`${base}/article/${slug}`, { waitUntil: "networkidle" });
    const flowchart = page.locator("#article-flowchart");
    await expect(flowchart).toBeVisible();
    await flowchart.getByRole("tab", { name: /看单四步路径/ }).click();
    await expect(flowchart.locator(".flowchart-detail")).toContainText("看单第 01 步");
    await flowchart.getByRole("tab", { name: /原理与检测流程/ }).click();

    const box = page.locator("#article-concept-3d");
    await box.scrollIntoViewIfNeeded();
    await expect(box.locator(".three-stage-canvas")).toHaveCount(0);
    await box.getByRole("button", { name: /打开 3D 观察/ }).click();
    await expect(box.locator(".three-stage-canvas")).toBeVisible({ timeout: 15000 });
    await expect(box.locator(".three-stage-loading")).toHaveCount(0, { timeout: 15000 });
    await box.getByRole("button", { name: secondMode, exact: true }).click();
    if (screenshotDir) {
      await page.waitForTimeout(550);
      await box.screenshot({ path: `${screenshotDir}/${shotName}` });
    }
  }

  // 5. Specialized Interactive Visual Labs across all 14 featured checkup indicators
  for (const [slug, btnRegex, shotName] of [
    ["ecg", /P 波/, "vlab-ecg.png"],
    ["pressure", /舒张压/, "vlab-pressure.png"],
    ["lipids", /HDL-C/, "vlab-lipids.png"],
    ["liver-function", /胆红素与胆汁通路/, "vlab-liver-function.png"],
    ["glucose", /餐后 \/ OGTT/, "vlab-glucose.png"],
    ["thyroid-nodule", /多条可疑特征组合/, "vlab-thyroid-nodule.png"],
    ["breast-ultrasound", /规整实性/, "vlab-breast-ultrasound.png"],
    ["cbc", /白细胞与分类/, "vlab-cbc.png"],
    ["urinalysis", /显微镜沉渣检查/, "vlab-urinalysis.png"],
    ["uric-acid", /肾脏排出减慢/, "vlab-uric-acid.png"],
    ["h-pylori", /假阴性/, "vlab-h-pylori.png"],
    ["fatty-liver", /超声之外还要看什么/, "vlab-fatty-liver.png"],
    ["gallbladder", /胆囊结石/, "vlab-gallbladder.png"],
    ["tumor-markers", /动态趋势比单次值更关键/, "vlab-tumor-markers.png"],
  ]) {
    await page.goto(`${base}/article/${slug}`, { waitUntil: "networkidle" });
    const vlab = page.locator("#article-visual-lab");
    await expect(vlab).toBeVisible();
    await vlab.scrollIntoViewIfNeeded();
    await vlab.getByRole("button", { name: btnRegex }).click();
    if (slug === "ecg") {
      await vlab.getByRole("button", { name: /偶发早搏/ }).click();
    }
    if (slug === "gallbladder") {
      await vlab.getByRole("button", { name: /左侧卧/ }).click();
    }
    if (screenshotDir) {
      await page.waitForTimeout(200);
      await vlab.screenshot({ path: `${screenshotDir}/${shotName}` });
    }
  }

  // 5b. A-Z Checkup Abbreviation Glossary (/glossary)
  await page.goto(`${base}/glossary`, { waitUntil: "networkidle" });
  await expect(page.locator(".glossary-card").first()).toBeVisible();
  if (screenshotDir) {
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${screenshotDir}/glossary-az.png`, fullPage: false });
  }
  await page.locator("#glossary-search").fill("eGFR");
  await expect(page.locator(".glossary-card").first()).toContainText("eGFR");
  await expect(page.locator(".glossary-card").first()).toContainText("估算肾小球滤过率");
  await page.locator(".glossary-clear-input").click();
  await page.locator(".glossary-alpha").getByRole("button", { name: "T", exact: true }).click();
  await expect(page.locator(".glossary-letter-heading span")).toHaveText("T");

  // 6. Mobile 320px/390px overflow safety check with 3D + visual lab + glossary open
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${base}/glossary`, { waitUntil: "networkidle" });
    await expect(page.locator(".glossary-card").first()).toBeVisible();
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Glossary overflow at ${width}px`,
    );
    await page.goto(`${base}/article/gallbladder`, { waitUntil: "networkidle" });
    await expect(page.locator("#article-visual-lab")).toBeVisible();
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Gallbladder visual lab overflow at ${width}px`,
    );
    await page.goto(`${base}/article/lung-nodule`, { waitUntil: "networkidle" });
    await page.locator("#article-concept-3d").getByRole("button", { name: /打开 3D 观察/ }).click();
    await expect(page.locator("#article-concept-3d .three-stage-canvas")).toBeVisible({ timeout: 15000 });
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `3D slice + flowchart overflow at ${width}px`,
    );
  }

  assert.deepEqual(failedModels, [], `Failed GLB model requests: ${failedModels.join(", ")}`);
  assert.deepEqual(errors, []);
  console.log("PASS NIH HuBMAP GLB models, lazy loading, 6/6 organ 3D sandboxes, 3D body map, 3 article concept slices, 14 specialized indicator visual labs, A-Z glossary, indicator flowcharts and 320px responsive layout.");
} finally {
  await browser.close();
}
