import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1080 },
  reducedMotion: "reduce",
});
const errors = [];
const contentRequests = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  if (request.url().includes("/content/")) contentRequests.push(request.url());
});
await mkdir("artifacts", { recursive: true });
const desktopNav = () =>
  page.getByRole("navigation", { name: "主导航", exact: true });
const mobileNav = () =>
  page.getByRole("navigation", { name: "移动端导航", exact: true });
async function noOverflow(label) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    `${label}: horizontal overflow`,
  );
}
try {
  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
  await expect(page.locator(".indicator-card")).toHaveCount(3);
  assert.equal(
    contentRequests.filter((url) => /\/indicator\/|\/organ\//.test(url)).length,
    0,
    "Home must not load full articles",
  );
  await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
  await page.getByRole("button", { name: /01 血糖/ }).click();
  await expect(
    page.getByRole("heading", { name: "认识血糖", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/#\/article\/glucose$/);
  assert.equal(
    contentRequests.filter((url) => /\/indicator\//.test(url)).length,
    1,
  );
  await expect(page.getByRole("region", { name: "知识来源" })).toBeAttached();
  assert.equal(await page.locator(".source-list a").count(), 4);
  await page
    .getByRole("button", { name: "查看参考资料 2", exact: true })
    .first()
    .click();
  await expect(page.locator("#article-source-tests")).toBeInViewport();
  await expect(page).toHaveURL(/#\/article\/glucose$/);
  await page.getByRole("button", { name: "收藏知识", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "已收藏", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "返回上一页" }).click();
  await expect(page.getByRole("heading", { name: /看懂指标/ })).toBeVisible();
  await page
    .getByRole("button", { name: "搜索指标或器官", exact: true })
    .click();
  await page.getByRole("textbox").fill("LDL");
  await page.getByRole("button", { name: /指标 血脂/ }).click();
  await expect(
    page.getByRole("heading", { name: "认识血脂", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "探索器官", exact: true }).click();
  await expect(page.locator(".organ-information h2")).toContainText("肝脏");
  await expect(page.locator(".source-panel")).toContainText(
    "Your Digestive System",
  );
  await page.getByRole("button", { name: "了解肾脏", exact: true }).click();
  await expect(page.locator(".organ-information h2")).toContainText("肾脏");
  await desktopNav()
    .getByRole("button", { name: "健康地图", exact: true })
    .click();
  await page.getByRole("button", { name: "1 分钟认识身体" }).click();
  await page.getByRole("button", { name: "继续了解" }).click();
  await page.getByRole("button", { name: "继续了解" }).click();
  await page.getByRole("button", { name: "开始探索", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await desktopNav()
    .getByRole("button", { name: "健康地图", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(mobileNav()).toBeVisible();
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: false });
  await mobileNav().getByRole("button", { name: "指标百科" }).click();
  await page.getByRole("button", { name: "营养与代谢", exact: true }).click();
  await expect(page.locator(".indicator-card")).toHaveCount(2);
  await page.getByRole("textbox", { name: "筛选指标" }).fill("LDL");
  await expect(page.locator(".indicator-card")).toHaveCount(1);
  await page.getByRole("textbox", { name: "筛选指标" }).fill("");
  await page.getByRole("button", { name: "全部指标", exact: true }).click();
  await expect(page.locator(".indicator-card")).toHaveCount(3);
  await page.screenshot({
    path: "artifacts/mobile-library.png",
    fullPage: false,
  });
  await page.getByRole("button", { name: /02 血压/ }).click();
  await expect(
    page.getByRole("heading", { name: "认识血压", exact: true }),
  ).toBeVisible();
  await expect(mobileNav()).toBeHidden();
  await page.screenshot({
    path: "artifacts/mobile-detail.png",
    fullPage: false,
  });
  const articleUrl = page.url();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "认识血压", exact: true }),
  ).toBeVisible();
  assert.equal(page.url(), articleUrl);
  await page
    .getByRole("button", { name: "查看参考资料 2", exact: true })
    .last()
    .click();
  await expect(page.locator("#article-source-bp")).toBeInViewport();
  await page
    .locator("#article-source-panel")
    .evaluate((node) =>
      node.scrollIntoView({ behavior: "instant", block: "start" }),
    );
  await page.screenshot({
    path: "artifacts/mobile-sources.png",
    fullPage: false,
  });
  await page.getByRole("button", { name: "返回上一页" }).click();
  await expect(mobileNav()).toBeVisible();
  for (const width of [320, 360, 390, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const name of ["器官探索", "我的收藏", "健康地图", "指标百科"]) {
      await mobileNav().getByRole("button", { name, exact: true }).click();
      await expect(page.locator(".load-state")).toHaveCount(0);
      await noOverflow(`${width}/${name}`);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await mobileNav().getByRole("button", { name: "器官探索" }).click();
  await page
    .locator(".mobile-organ-tabs")
    .getByRole("button", { name: "肝脏", exact: true })
    .click();
  await expect(page.locator(".organ-information h2")).toContainText("肝脏");
  await page.screenshot({
    path: "artifacts/mobile-organs.png",
    fullPage: false,
  });
  await page
    .getByRole("button", { name: "搜索指标或器官", exact: true })
    .click();
  await page.getByRole("textbox").fill("不存在的专题");
  await expect(
    page.getByText("暂时没有这个专题。试试血糖、血压、血脂或器官名称。"),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  // A larger fixture verifies rendered pages, without putting synthetic medical content into the product.
  const catalog = JSON.parse(
    await readFile("public/content/index.json", "utf8"),
  );
  const sample = catalog.items.find((item) => item.id === "glucose");
  const fixture = {
    ...catalog,
    items: Array.from({ length: 31 }, (_, i) => ({
      ...sample,
      id: `fixture-${i}`,
      title: `分页样例 ${i}`,
      number: String(i),
    })),
  };
  await page.route("**/content/index.json", (route) =>
    route.fulfill({ json: fixture }),
  );
  await page.goto("http://localhost:5173/#/indicators");
  await page.reload();
  await expect(page.locator(".indicator-card")).toHaveCount(6);
  const firstPage = await page.locator(".metric-title h3").allTextContents();
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  await expect(page.locator(".metric-title h3").first()).toHaveText(
    "分页样例 6",
  );
  assert.ok(
    (await page.locator(".metric-title h3").allTextContents()).every(
      (title) => !firstPage.includes(title),
    ),
  );
  await page.getByRole("button", { name: "返回首页", exact: true }).click();
  await expect(page.locator(".metric-title h3").first()).toHaveText(
    "分页样例 0",
  );
  await page.unroute("**/content/index.json");

  // A failed detail fetch must present a working retry instead of a blank page.
  let failures = 0;
  await page.goto("about:blank");
  await page.route("**/content/indicator/glucose.json", (route) =>
    ++failures === 1
      ? route.fulfill({ status: 503, json: { error: "temporary" } })
      : route.continue(),
  );
  await page.goto("http://localhost:5173/#/article/glucose");
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "重新加载", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "认识血糖", exact: true }),
  ).toBeVisible();
  await page.unroute("**/content/indicator/glucose.json");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.copiedLink = text;
        },
      },
    });
  });
  await page.getByRole("button", { name: "分享这篇知识" }).click();
  await expect(page.getByText("链接已复制", { exact: true })).toBeVisible();
  assert.equal(
    await page.evaluate(() => window.copiedLink),
    "http://localhost:5173/#/article/glucose",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: citations, lazy content, deep links, back/reload, bookmarks, search, filters, pagination, retry, mobile navigation and 320–768px layouts. No page errors.",
  );
} finally {
  await browser.close();
}
