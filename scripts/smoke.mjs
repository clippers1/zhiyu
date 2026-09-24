import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { selectPage } from "../src/services/content.js";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";
const contentApi = process.env.CONTENT_API_BASE_URL;
const apiPath = contentApi ? new URL(contentApi, baseUrl).pathname.replace(/\/$/, "") : "";
const catalogRoute = contentApi
  ? (url) => url.pathname === `${apiPath}/content`
  : "**/content/index.json";
const glucoseRoute = contentApi
  ? `**${apiPath}/content/indicator/glucose`
  : "**/content/indicator/glucose.json";

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
  await page.goto(baseUrl, {
    waitUntil: "networkidle",
  });
  await expect(page.locator(".question-card")).toHaveCount(3);
  await expect(page.locator(".home-reading-path a")).toHaveCount(1);
  await expect(page.locator(".home-reading-path a")).toHaveAttribute("href", "/topics");
  assert.equal(
    contentRequests.filter((url) => /\/indicator\/|\/organ\//.test(url)).length,
    0,
    "Home must not load full articles",
  );
  await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
  await page.locator(".question-card", { hasText: "血糖项目主要看什么" }).click();
  await expect(
    page.getByRole("heading", { name: "血糖项目主要看什么？", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/article\/glucose$/);
  assert.ok(
    contentRequests.filter((url) => /\/indicator\//.test(url)).length <= 1,
    "SSR may preload the detail, but navigation must not request it more than once",
  );
  await expect(page.getByRole("region", { name: "知识来源" })).toBeAttached();
  assert.equal(await page.locator(".source-list a").count(), 4);
  assert.ok(await page.evaluate(() => {
    const reminder = document.querySelector('#article-reminder');
    const figure = document.querySelector('#article-figure');
    const metrics = document.querySelector('#article-metrics');
    return reminder && figure && metrics && (reminder.compareDocumentPosition(figure) & Node.DOCUMENT_POSITION_FOLLOWING) && (figure.compareDocumentPosition(metrics) & Node.DOCUMENT_POSITION_FOLLOWING);
  }), 'The published caveat and figure precede the deeper metrics');
  await page
    .getByRole("link", { name: "查看参考资料 2", exact: true })
    .first()
    .click();
  await expect(page.locator("#article-source-tests")).toBeInViewport();
  await expect(page).toHaveURL(/\/article\/glucose$/);
  await page.getByRole("button", { name: "返回上一页" }).click();
  await expect(page.getByRole("heading", { name: /看懂体检单/ })).toBeVisible();
  await page
    .getByRole("button", { name: "搜索体检项目或器官", exact: true })
    .click();
  await page.getByRole("textbox").fill("LDL");
  await page.getByRole("link", { name: /项目 血脂/ }).click();
  await expect(
    page.getByRole("heading", { name: "血脂单里几个名称有什么区别？", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "探索器官", exact: true }).click();
  await expect(page.locator(".organ-information h2")).toContainText("肝脏");
  await expect(page.locator(".source-panel")).toContainText(
    "Your Digestive System",
  );
  await page.getByRole("link", { name: "肾脏", exact: true }).click();
  await expect(page.locator(".organ-information h2")).toContainText("肾脏");
  await desktopNav()
    .getByRole("link", { name: "发现", exact: true })
    .click();
  await page.getByRole("button", { name: "1 分钟认识身体" }).click();
  await page.getByRole("button", { name: "继续了解" }).click();
  await page.getByRole("button", { name: "继续了解" }).click();
  await page.getByRole("button", { name: "开始探索", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await desktopNav()
    .getByRole("link", { name: "发现", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(mobileNav()).toBeVisible();
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: false });
  await mobileNav().getByRole("link", { name: "看体检项目" }).click();
  await page.getByRole("textbox", { name: "筛选体检项目" }).fill("LDL");
  await expect(page.locator(".question-row")).toHaveCount(1);
  await page.getByRole("textbox", { name: "筛选体检项目" }).fill("");
  await expect(page.locator(".question-row")).toHaveCount(6);
  await page.screenshot({
    path: "artifacts/mobile-library.png",
    fullPage: false,
  });
  await page.getByRole("link", { name: /血压单上的两个数字/ }).click();
  await expect(
    page.getByRole("heading", { name: "血压单上的两个数字在说什么？", exact: true }),
  ).toBeVisible();
  await expect(mobileNav()).toBeHidden();
  await page.screenshot({
    path: "artifacts/mobile-detail.png",
    fullPage: false,
  });
  const articleUrl = page.url();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "血压单上的两个数字在说什么？", exact: true }),
  ).toBeVisible();
  assert.equal(page.url(), articleUrl);
  await page
    .getByRole("link", { name: "查看参考资料 2", exact: true })
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
    for (const name of ["认识身体", "发现", "看体检项目"]) {
      await mobileNav().getByRole("link", { name, exact: true }).click();
      await expect(page.locator(".load-state")).toHaveCount(0);
      await noOverflow(`${width}/${name}`);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await mobileNav().getByRole("link", { name: "认识身体" }).click();
  await page
    .locator(".mobile-organ-tabs")
    .getByRole("link", { name: "肝脏", exact: true })
    .click();
  await expect(page.locator(".organ-information h2")).toContainText("肝脏");
  await page.screenshot({
    path: "artifacts/mobile-organs.png",
    fullPage: false,
  });
  await page
    .getByRole("button", { name: "搜索体检项目或器官", exact: true })
    .click();
  await page.getByRole("textbox").fill("不存在的专题");
  await expect(
    page.getByText("没有找到匹配的项目。试试“血糖”“肝功能”或项目缩写，也可以换一种问法。"),
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
      question: null,
      questionAnswer: null,
      number: String(i),
    })),
  };
  await page.route(catalogRoute, (route) => {
    if (!contentApi) return route.fulfill({ json: fixture });
    const params = new URL(route.request().url()).searchParams;
    const options = Object.fromEntries(params);
    if (params.has("ids")) options.ids = params.get("ids").split(",").filter(Boolean);
    if (params.has("featured")) options.featured = params.get("featured") === "true";
    return route.fulfill({ json: selectPage(fixture, options) });
  });
  await page.goto(`${baseUrl}/indicators`);
  await page.reload();
  await expect(page.locator(".question-row")).toHaveCount(6);
  const firstPage = await page.locator(".question-row-term b").allTextContents();
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  await expect(page.locator(".question-row-term b").first()).toHaveText(
    "分页样例 6",
  );
  assert.ok(
    (await page.locator(".question-row-term b").allTextContents()).every(
      (title) => !firstPage.includes(title),
    ),
  );
  await page.getByRole("button", { name: "返回首页", exact: true }).click();
  await expect(page.locator(".question-row-term b").first()).toHaveText(
    "分页样例 0",
  );
  await page.unroute(catalogRoute);

  // A failed detail fetch must present a working retry instead of a blank page.
  let failures = 0;
  await page.goto("about:blank");
  await page.route(glucoseRoute, (route) =>
    ++failures === 1
      ? route.fulfill({ status: 503, json: { error: "temporary" } })
      : route.continue(),
  );
  await page.goto(`${baseUrl}/article/glucose`);
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "重新加载", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "血糖项目主要看什么？", exact: true }),
  ).toBeVisible();
  await page.unroute(glucoseRoute);
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
    `${baseUrl}/article/glucose`,
  );
  // Previously shared Hash URLs retain their destination after migration.
  await page.goto(`${baseUrl}/?from=legacy#/article/glucose`);
  await expect(page).toHaveURL(`${baseUrl}/article/glucose?from=legacy`);
  await expect(page.getByRole("heading", { name: "血糖项目主要看什么？", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "返回上一页" }).click();
  await expect(page).toHaveURL(`${baseUrl}/indicators`);
  await page.getByRole("link", { name: /血压单上的两个数字/ }).click();
  await page.goBack();
  await expect(page).toHaveURL(`${baseUrl}/indicators`);
  await page.goForward();
  await expect(page).toHaveURL(`${baseUrl}/article/pressure`);
  await page.reload();
  await expect(page.getByRole("heading", { name: "血压单上的两个数字在说什么？", exact: true })).toBeVisible();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: citations, lazy content, deep links, back/reload, search, filters, pagination, retry, mobile navigation and 320–768px layouts. No page errors.",
  );
} finally {
  await browser.close();
}
