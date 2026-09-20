import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  createContentRepository,
  selectPage,
} from "../src/services/content.js";

test("all published demo content has valid references, related records and indexed metadata", async () => {
  const catalog = JSON.parse(
    await fs.readFile("public/content/index.json", "utf8"),
  );
  const keys = new Set(catalog.items.map((item) => `${item.kind}/${item.id}`));
  assert.equal(keys.size, catalog.items.length);
  for (const summary of catalog.items) {
    const entry = JSON.parse(
      await fs.readFile(
        `public/content/${summary.kind}/${summary.id}.json`,
        "utf8",
      ),
    );
    assert.equal(entry.id, summary.id);
    assert.equal(entry.kind, summary.kind);
    assert.equal(summary.referenceCount, entry.references.length);
    assert.ok(entry.version > 0);
    assert.ok(entry.updatedAt);
    assert.equal(entry.reviewStatus, "pending");
    const sourceIds = new Set(entry.references.map((ref) => ref.id));
    assert.equal(sourceIds.size, entry.references.length);
    for (const source of entry.references) {
      assert.equal(new URL(source.url).protocol, "https:");
      assert.ok(
        source.publisher && source.title && source.scope && source.accessedAt,
      );
    }
    for (const id of [
      ...(entry.descriptionSourceIds || []),
      ...(entry.tipSourceIds || []),
      ...(entry.metrics || []).flatMap((metric) => metric.sourceIds),
    ])
      assert.ok(sourceIds.has(id), `${entry.id}: missing reference ${id}`);
    if (entry.learning) {
      assert.ok(["heart-flow-v1", "lung-gas-exchange-v1"].includes(entry.learning.type));
      assert.ok(entry.learning.parts.length >= 4 && entry.learning.steps.length >= 2);
      const partIds = new Set(entry.learning.parts.map((part) => part.id));
      assert.equal(partIds.size, entry.learning.parts.length);
      assert.equal(entry.learning.questions, undefined);
      for (const item of [...entry.learning.parts, ...entry.learning.steps]) {
        for (const id of item.sourceIds) assert.ok(sourceIds.has(id), `${entry.id}: learning item missing reference ${id}`);
      }
      for (const step of entry.learning.steps) assert.ok(partIds.has(step.from) && partIds.has(step.to));
    }
    for (const id of entry.related || [])
      assert.ok(keys.has(`indicator/${id}`));
  }
});
test("10,000 summary records paginate without duplicates and combine filters", () => {
  const catalog = {
    categories: [
      { id: "even", name: "Even" },
      { id: "odd", name: "Odd" },
    ],
    items: Array.from({ length: 10000 }, (_, i) => ({
      id: `sample-${i}`,
      kind: "indicator",
      title: `专题 ${i}`,
      subtitle: "",
      searchText: i % 2 ? "LDL" : "血糖",
      category: i % 2 ? "odd" : "even",
    })),
  };
  let cursor = "0";
  const seen = new Set();
  do {
    const page = selectPage(catalog, {
      kind: "indicator",
      query: "ldl",
      category: "odd",
      cursor,
      limit: 24,
    });
    assert.equal(page.total, 5000);
    assert.ok(page.items.length <= 24);
    for (const item of page.items) {
      assert.ok(!seen.has(item.id));
      seen.add(item.id);
    }
    cursor = page.nextCursor;
  } while (cursor);
  assert.equal(seen.size, 5000);
  assert.equal(selectPage(catalog, { ids: [] }).total, 0);
  assert.equal(selectPage(catalog, { query: "没有这个关键词" }).total, 0);
  assert.equal(selectPage(catalog, { limit: 100000 }).items.length, 24);
});
test("remote adapter passes paging, filters and cancellation to a real HTTP-shaped contract", async () => {
  const calls = [];
  const controller = new AbortController();
  const repository = createContentRepository({
    apiBase: "https://example.test/api/",
    fetcher: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () =>
          url.includes("/indicator/")
            ? { id: "glucose", kind: "indicator", references: [] }
            : { items: [], total: 0, nextCursor: null, categories: [] },
      };
    },
  });
  await repository.list(
    {
      kind: "indicator",
      query: "血糖",
      cursor: "opaque-cursor",
      limit: 6,
      ids: ["glucose"],
    },
    { signal: controller.signal },
  );
  const url = new URL(calls[0].url);
  assert.equal(url.pathname, "/api/content");
  assert.equal(url.searchParams.get("query"), "血糖");
  assert.equal(url.searchParams.get("cursor"), "opaque-cursor");
  assert.equal(calls[0].options.signal, controller.signal);
  assert.equal((await repository.get("indicator", "glucose")).id, "glucose");
});
test("failed JSON requests can be retried and unsafe ids are rejected", async () => {
  let count = 0;
  const repository = createContentRepository({
    fetcher: async () => {
      count++;
      return {
        ok: count > 1,
        status: 503,
        json: async () => ({
          id: "glucose",
          kind: "indicator",
          references: [],
        }),
      };
    },
  });
  await assert.rejects(() => repository.get("indicator", "glucose"));
  assert.equal((await repository.get("indicator", "glucose")).id, "glucose");
  await assert.rejects(() => repository.get("indicator", "../private"));
  assert.equal(count, 2);
});
