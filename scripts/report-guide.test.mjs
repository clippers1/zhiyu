import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DIAGRAM_NAMES } from "../src/services/diagram-names.js";
import {
  GUIDE_CONTENT,
  GUIDE_FAQ,
  GUIDE_REFERENCES,
  GUIDE_SECTIONS,
  REPORT_ROWS,
  reportRowsFor,
} from "../src/services/report-guide.js";

const catalog = JSON.parse(await readFile("public/content/index.json", "utf8"));
const indicators = new Map(catalog.items.filter(item => item.kind === "indicator").map(item => [item.id, item]));
const normalize = value => String(value ?? "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9一-鿿]/g, "");
const latin = value => String(value ?? "").normalize("NFKC").toLowerCase();

// The guide explains report layout, not personal results. A number, a
// threshold phrase or an arrow treated as a judgement would turn it into one.
const VALUES = [/[0-9０-９]/, /[↑↓]/, /[<>＜＞≤≥]/];
const JUDGEMENTS = [/正常值|参考值|多少算高|超标/];

test("guide sources are the same reviewed references as the lab-range story", async () => {
  const story = JSON.parse(await readFile("public/content/story/lab-range.json", "utf8"));
  assert.deepEqual(GUIDE_REFERENCES, story.references, "guide references must not drift from the published story");
  assert.equal(new Set(GUIDE_REFERENCES.map(source => source.id)).size, GUIDE_REFERENCES.length);
  for (const source of GUIDE_REFERENCES) {
    assert.match(source.url, /^https:\/\//, `${source.id}: HTTPS only`);
    assert.ok(source.publisher && source.title && source.scope && source.locator, `${source.id}: publisher, title, scope and locator`);
    assert.match(source.accessedAt, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("every guide statement resolves to a guide source", () => {
  const ids = new Set(GUIDE_REFERENCES.map(source => source.id));
  assert.ok(GUIDE_SECTIONS.length >= 4, "the guide needs at least four sections");
  for (const section of GUIDE_SECTIONS) {
    assert.ok(section.title.trim(), "section title");
    assert.ok(section.paragraphs.length >= 2, `${section.title}: at least two paragraphs`);
    for (const paragraph of section.paragraphs) {
      assert.ok(paragraph.text.trim(), `${section.title}: paragraph text`);
      assert.ok(paragraph.sourceIds.length, `${section.title}: every paragraph is sourced`);
      for (const id of paragraph.sourceIds) assert.ok(ids.has(id), `${section.title}: unknown source ${id}`);
    }
  }
  assert.ok(GUIDE_FAQ.length >= 4, "the guide needs at least four questions");
  const questions = new Set();
  for (const item of GUIDE_FAQ) {
    assert.ok(item.question.trim() && item.answer.trim(), "FAQ question and answer");
    assert.ok(!questions.has(item.question), `duplicate FAQ: ${item.question}`);
    questions.add(item.question);
    assert.ok(item.sourceIds.length, `${item.question}: FAQ answers are sourced`);
    for (const id of item.sourceIds) assert.ok(ids.has(id), `${item.question}: unknown source ${id}`);
    assert.ok(!/^如何理解.+？$/.test(item.question), `${item.question}: generated-style question`);
  }
  const body = GUIDE_SECTIONS.flatMap(section => section.paragraphs.map(paragraph => paragraph.text.trim()));
  for (const item of GUIDE_FAQ) assert.ok(!body.includes(item.answer.trim()), `${item.question}: answer must not repeat the prose verbatim`);
});

test("the guide content object feeds SourceReferences like any published page", () => {
  assert.equal(GUIDE_CONTENT.references, GUIDE_REFERENCES);
  assert.equal(GUIDE_CONTENT.reviewStatus, "pending", "the guide is unreviewed, like every static pack");
  assert.ok(GUIDE_CONTENT.applicability && GUIDE_CONTENT.limitations);
  assert.match(GUIDE_CONTENT.updatedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(GUIDE_CONTENT.version > 0);
});

test("report rows cover exactly the published indicators", () => {
  assert.deepEqual(Object.keys(REPORT_ROWS).sort(), [...indicators.keys()].sort());
  for (const [id, entry] of Object.entries(REPORT_ROWS)) {
    assert.equal(entry.title, indicators.get(id).title, `${id}: display title follows the catalog`);
    assert.ok(entry.rows.length >= 1 && entry.rows.length <= 6, `${id}: one to six printed rows`);
    assert.equal(new Set(entry.rows).size, entry.rows.length, `${id}: rows are unique`);
    assert.deepEqual(reportRowsFor(id), entry.rows);
  }
  assert.deepEqual(reportRowsFor("does-not-exist"), []);
});

test("printed row names exist in the article that explains them", () => {
  for (const [id, entry] of Object.entries(REPORT_ROWS)) {
    const searchText = latin(indicators.get(id).searchText);
    for (const label of entry.rows) {
      // "名称（缩写）": the Chinese name must be a contiguous run in the
      // article, and each abbreviation a standalone token — so "UA" never
      // matches inside "SUA" and a label cannot point at prose that is absent.
      const match = /^(.+?)（(.+?)）$/.exec(label);
      const term = match ? match[1] : label;
      assert.ok(normalize(searchText).includes(normalize(term)), `${id}: "${term}" does not appear in the article`);
      if (!match) continue;
      for (const token of match[2].split(/\s*\/\s*|\s*·\s*/)) {
        if (/^[a-z0-9-]+$/i.test(token)) {
          const pattern = new RegExp(`(^|[^a-z0-9])${token.toLowerCase()}($|[^a-z0-9])`, "i");
          assert.ok(pattern.test(searchText), `${id}: abbreviation "${token}" is not used on the page`);
        } else {
          assert.ok(normalize(searchText).includes(normalize(token)), `${id}: "${token}" is not used on the page`);
        }
      }
    }
  }
});

test("the guide never prints a threshold, a value or an arrow as a judgement", () => {
  // Prose must not carry numbers, units or arrow glyphs at all: those belong
  // on a specific report, not in a general explanation.
  const prose = [
    ...GUIDE_SECTIONS.flatMap(section => [section.title, ...section.paragraphs.map(paragraph => paragraph.text)]),
    ...GUIDE_FAQ.flatMap(item => [item.question, item.answer]),
  ];
  for (const value of prose) {
    for (const pattern of VALUES) assert.ok(!pattern.test(value), `numeric or arrow text in: ${value}`);
  }
  // Row labels may legitimately contain digit-bearing abbreviations (T4, T3),
  // but they must never read as a threshold or a verdict.
  const labels = Object.values(REPORT_ROWS).flatMap(entry => entry.rows);
  for (const label of labels) {
    for (const pattern of JUDGEMENTS) assert.ok(!pattern.test(label), `${label}: threshold wording`);
  }
  // The guide may discuss the phrase 「正常值」 to warn against it, but it must
  // never present it as a rule the reader should apply.
  const combined = prose.join("\n");
  for (const pattern of JUDGEMENTS) {
    for (const match of combined.matchAll(new RegExp(pattern, "g"))) {
      const around = combined.slice(Math.max(0, match.index - 12), match.index + match[0].length + 12);
      assert.match(around, /容易|不是|不等于|误解|不成立|不应|别把|不能/, `「${match[0]}」 presented as a rule: ${around}`);
    }
  }
});

test("the report diagram is registered for both the renderer and the content tests", async () => {
  assert.ok(DIAGRAM_NAMES.includes("report-anatomy"));
  const source = await readFile("src/components/Diagrams.jsx", "utf8");
  assert.match(source, /export function ReportAnatomy/);
  assert.match(source, /"report-anatomy": ReportAnatomy/);
});
