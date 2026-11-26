import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { filterGlossary, GLOSSARY_GROUPS, GLOSSARY_ITEMS, GLOSSARY_LETTERS } from "../src/services/glossary.js";
import { parseRoute, routePath } from "../src/services/routes.js";

test("glossary entries are unique, valid, threshold-free, and link only to published indicators", async () => {
  const catalog = JSON.parse(await fs.readFile("public/content/index.json", "utf8"));
  const indicatorIds = new Set(
    catalog.items.filter((item) => item.kind === "indicator").map((item) => item.id),
  );
  const groupIds = new Set(GLOSSARY_GROUPS.map((g) => g.id));
  const codes = new Set();

  assert.ok(GLOSSARY_ITEMS.length >= 50, `Expected at least 50 glossary items, got ${GLOSSARY_ITEMS.length}`);
  assert.ok(GLOSSARY_LETTERS.length >= 14, "Expected wide A-Z alphabet coverage");

  for (const item of GLOSSARY_ITEMS) {
    assert.ok(item.code && !codes.has(item.code), `Duplicate or empty code: ${item.code}`);
    codes.add(item.code);
    assert.match(item.letter, /^[A-Z]$/, `${item.code}: letter must be A-Z`);
    assert.ok(item.zh && item.en && item.summary, `${item.code}: missing fields`);
    assert.ok(groupIds.has(item.group) && item.group !== "all", `${item.code}: invalid group ${item.group}`);
    assert.ok(indicatorIds.has(item.articleId), `${item.code}: unknown articleId ${item.articleId}`);
    // Ensure zero numeric diagnostic thresholds or dosage claims sneak into glossary summaries
    assert.doesNotMatch(item.summary, /\d+(\.\d+)?\s*(mmol\/L|mg\/dL|mmHg|U\/L|μmol\/L|ng\/mL)/i, `${item.code}: contains numeric lab threshold`);
  }
});

test("glossary filtering handles abbreviation, Chinese aliases, letter and group cleanly", () => {
  assert.ok(filterGlossary({ query: "alt" }).some((i) => i.code === "ALT"));
  assert.ok(filterGlossary({ query: "谷丙转氨酶" }).some((i) => i.code === "ALT"));
  assert.ok(filterGlossary({ query: "birads" }).some((i) => i.code === "BI-RADS"));
  assert.ok(filterGlossary({ query: "磨玻璃" }).some((i) => i.code === "GGO / GGN"));
  assert.ok(filterGlossary({ letter: "T" }).every((i) => i.letter === "T"));
  assert.ok(filterGlossary({ group: "cardio" }).every((i) => i.group === "cardio"));
  assert.equal(filterGlossary({ query: "完全不存在的缩写XYZ" }).length, 0);
});

test("glossary route resolves cleanly in shared router", () => {
  assert.deepEqual(parseRoute("/glossary"), { page: "glossary", id: "" });
  assert.equal(routePath("glossary"), "/glossary");
  assert.deepEqual(parseRoute("/glossary/extra"), { page: "not-found", id: "" });
});
