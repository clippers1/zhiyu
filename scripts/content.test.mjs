import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  createContentRepository,
  selectPage,
} from "../src/services/content.js";

const KIND_DIRS = ["indicator", "organ", "story"];
const chineseChars = value => (String(value || "").match(/[一-鿿]/g) || []).length;

// Long-form content is held to a higher bar than entry-style records: a page
// that only restates its own summary is the failure mode this gate exists for.
function assertLongForm(entry, name) {
  assert.ok(Array.isArray(entry.sections) && entry.sections.length >= 4, `${name}: sections >= 4`);
  let body = 0;
  for (const section of entry.sections) {
    assert.ok(typeof section.title === "string" && section.title.trim(), `${name}: section title`);
    assert.ok(Array.isArray(section.paragraphs) && section.paragraphs.length >= 2, `${name}: two paragraphs per section`);
    for (const paragraph of section.paragraphs) {
      body += chineseChars(paragraph.text);
      assert.ok(Array.isArray(paragraph.sourceIds) && paragraph.sourceIds.length, `${name}: unsourced paragraph`);
    }
  }
  assert.ok(body >= 900, `${name}: body has ${body} Chinese characters; at least 900 required`);

  assert.ok(Array.isArray(entry.faq) && entry.faq.length >= 4, `${name}: faq >= 4`);
  const questions = new Set();
  const answers = new Set([
    entry.desc,
    ...(entry.metrics || []).map(metric => metric.text),
    ...entry.sections.flatMap(section => section.paragraphs.map(paragraph => paragraph.text)),
  ].map(text => String(text || "").trim()));
  for (const item of entry.faq) {
    assert.ok(item.question && item.answer, `${name}: faq item incomplete`);
    assert.doesNotMatch(item.question, /^如何理解.+？$/, `${name}: generated ${item.question} question`);
    assert.ok(!questions.has(item.question), `${name}: duplicate question ${item.question}`);
    questions.add(item.question);
    assert.ok(!answers.has(item.answer.trim()), `${name}: faq answer restates the prose verbatim`);
    assert.ok(Array.isArray(item.sourceIds) && item.sourceIds.length, `${name}: unsourced faq answer`);
  }

  assert.ok(Array.isArray(entry.figures) && entry.figures.length >= 1, `${name}: one figure required`);
  assert.ok(entry.references.filter(source => source.locator).length >= 3, `${name}: three located sources`);
}

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
    const name = `${entry.kind}/${entry.id}`;
    assert.equal(entry.id, summary.id);
    assert.equal(entry.kind, summary.kind);
    assert.equal(summary.referenceCount, entry.references.length);
    // The home page renders the lead article's opening visual (diagram or
    // AI-generated illustration). The summary must mirror it verbatim.
    const lead = (entry.figures || []).find(
      (figure) => figure.diagram || (figure.src && figure.attribution?.kind !== "third-party"),
    );
    const expectedLead = !lead
      ? undefined
      : lead.diagram
        ? { diagram: lead.diagram, caption: lead.caption }
        : {
            src: lead.src,
            alt: lead.alt,
            caption: lead.caption,
            ...(lead.width ? { width: lead.width } : {}),
            ...(lead.height ? { height: lead.height } : {}),
            attribution: {
              kind: lead.attribution.kind,
              name: lead.attribution.name,
              ...(lead.attribution.model ? { model: lead.attribution.model } : {}),
            },
          };
    assert.deepEqual(
      summary.leadFigure,
      expectedLead,
      `${name}: leadFigure must mirror the opening self-made or AI figure`,
    );
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
      ...(entry.faq || []).flatMap((item) => item.sourceIds),
      ...(entry.sections || []).flatMap((section) => section.paragraphs.flatMap((paragraph) => paragraph.sourceIds)),
    ])
      assert.ok(sourceIds.has(id), `${entry.id}: missing reference ${id}`);
    if (entry.learning) {
      assert.ok(["heart-flow-v1", "lung-gas-exchange-v1", "kidney-filtration-v1", "thyroid-feedback-v1", "liver-metabolism-v1", "pancreas-dual-role-v1"].includes(entry.learning.type));
      assert.ok(entry.learning.parts.length >= 4 && entry.learning.steps.length >= 2);
      const partIds = new Set(entry.learning.parts.map((part) => part.id));
      assert.equal(partIds.size, entry.learning.parts.length);
      assert.equal(entry.learning.questions, undefined);
      for (const item of [...entry.learning.parts, ...entry.learning.steps]) {
        for (const id of item.sourceIds) assert.ok(sourceIds.has(id), `${entry.id}: learning item missing reference ${id}`);
      }
      for (const step of entry.learning.steps) assert.ok(partIds.has(step.from) && partIds.has(step.to));
    }
    const figures = [...(entry.figure ? [{...entry.figure, key: "legacy"}] : []), ...(entry.figures || [])];
    for (const figure of figures) {
      assert.ok(entry.kind !== "organ", "figures are not used on organ pages");
      // Every published figure must resolve to a static PNG/WebP under /media/
      // with a verified attribution record (no hardcoded JSX diagram coupling).
      assert.equal(figure.diagram, undefined, `${entry.id}: legacy JSX diagrams are removed; use /media/*.webp`);
      assert.match(figure.src, /^\/media\/[a-z0-9-]+\.(png|webp)$/);
      await fs.access(`public${figure.src}`);
      for (const id of figure.sourceIds)
        assert.ok(sourceIds.has(id), `${entry.id}: figure missing reference ${id}`);
      assert.ok(figure.alt && figure.caption && figure.simplification);
      assert.ok(figure.attribution?.name);
      if (figure.attribution.kind === "self-made") {
        assert.equal(figure.attribution.licenseUrl, undefined, "self-made figures carry no third-party licence");
      } else if (figure.attribution.kind === "ai-generated") {
        assert.ok(figure.attribution.model, `${entry.id}: ai-generated figure requires model name`);
        assert.equal(figure.attribution.licenseUrl, undefined, "ai-generated figures carry no third-party licence");
      } else {
        assert.ok(figure.attribution.license);
        assert.equal(new URL(figure.attribution.url).protocol, "https:");
        assert.equal(new URL(figure.attribution.licenseUrl).protocol, "https:");
      }
    }
    if (entry.figures) {
      for (const figure of entry.figures)
        assert.match(figure.key, /^[a-z0-9-]+$/, `${entry.id}: figure key`);
      for (const section of entry.sections || [])
        if (section.figure) assert.ok(entry.figures.some(figure => figure.key === section.figure), `${entry.id}: unknown figure ${section.figure}`);
    }
    for (const id of entry.related || [])
      assert.ok(keys.has(`indicator/${id}`) || keys.has(`story/${id}`), `${entry.id}: related content missing`);
    for (const item of entry.relatedOrgans || [])
      assert.ok(keys.has(`organ/${item.id}`), `${entry.id}: missing related organ ${item.id}`);
    if (entry.kind === "story") {
      assert.ok(!entry.metrics && !entry.chain, `${name}: stories do not reuse indicator templates`);
      assertLongForm(entry, name);
    } else if (entry.format === "article") {
      assertLongForm(entry, name);
      assert.ok(entry.metrics?.length >= 3, `${name}: long-form indicators keep a metrics list`);
    }
    if (entry.publicationReady) {
      assert.equal(entry.contentRisk, "foundational");
      assert.ok(entry.applicability && entry.limitations);
      assert.ok(entry.descriptionSourceIds?.length);
      assert.ok(entry.references.every(source => source.locator));
      if (entry.kind === "indicator") {
        assert.ok(entry.metrics?.length >= 3);
        assert.ok(entry.chain?.length >= 3 && entry.chainSourceIds?.length);
        assert.ok(entry.tip && entry.tipSourceIds?.length);
      }
    }
  }
});

test("every content directory in the catalog is also readable by the reader", async () => {
  for (const kind of KIND_DIRS) {
    const files = await fs.readdir(`public/content/${kind}`);
    assert.ok(files.every(file => file.endsWith(".json")), `${kind}: unexpected file`);
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

test("the shared /article/:id route resolves indicators and stories from the catalog", async () => {
  const catalog = JSON.parse(await fs.readFile("public/content/index.json", "utf8"));
  const asked = [];
  const repository = createContentRepository({
    fetcher: async url => {
      asked.push(url);
      // Mirrors the static host: an unknown file falls back to the HTML shell.
      if (url === "/content/index.json") return { ok: true, json: async () => catalog };
      const match = /^\/content\/([a-z]+)\/([a-z0-9-]+)\.json$/.exec(url);
      const item = match && catalog.items.find(entry => entry.kind === match[1] && entry.id === match[2]);
      if (!item) return { ok: true, json: async () => ({ id: "missing", kind: match?.[1] || "unknown", references: [] }) };
      return { ok: true, json: async () => JSON.parse(await fs.readFile(`public${url}`, "utf8")) };
    },
  });
  assert.equal((await repository.get("article", "glucose")).kind, "indicator");
  assert.equal((await repository.get("article", "stairs-heart")).kind, "story");
  assert.ok(!asked.some(url => url.includes("/story/glucose")), "an indicator id must not probe the story path");
  // The static host answers unknown paths with the HTML shell, so the catalog,
  // not a 404 status, decides whether an article exists.
  await assert.rejects(() => repository.get("article", "does-not-exist"), /不存在/);
});

test("a transport error still surfaces as a retryable failure", async () => {
  const failing = createContentRepository({
    fetcher: async url => {
      if (url === "/content/index.json") return { ok: true, json: async () => ({ items: [{ id: "glucose", kind: "indicator" }] }) };
      return { ok: false, status: 503, json: async () => ({}) };
    },
  });
  await assert.rejects(() => failing.get("article", "glucose"), /加载失败/);
});
