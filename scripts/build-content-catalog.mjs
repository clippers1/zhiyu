import assert from "node:assert/strict";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = path.join(root, "public/content");
const indexPath = path.join(contentDir, "index.json");
const check = process.argv.includes("--check");

const clean = value => String(value || "").replace(/\s+/g, " ").trim();
const unique = values => [...new Set(values.map(clean).filter(Boolean))];

// Long-form bodies are searchable too: section paragraphs and FAQ answers are
// the only place many of their terms appear.
function sectionText(body) {
  return (body.sections || []).flatMap(section => [
    section.title,
    ...(section.paragraphs || []).map(paragraph => paragraph.text),
  ]);
}
function faqText(body) {
  return (body.faq || []).flatMap(item => [item.question, item.answer]);
}

function summary(kind, body) {
  const title = clean(body.title || body.name);
  const subtitle = clean(body.subtitle || body.headline);
  const english = clean(body.english || body.en);
  const tags = kind === "indicator" || kind === "story"
    ? unique(body.tags || [])
    : unique(body.tags || clean(body.connection).split("·"));
  const learningText = body.learning
    ? [body.learning.title, body.learning.intro,
      ...(body.learning.parts || []).flatMap(item => [item.label, item.summary]),
      ...(body.learning.steps || []).flatMap(item => [item.title, item.text])]
    : [];
  const searchText = unique([
    title, subtitle, english, body.question || "", ...(body.searchAliases || []), ...tags,
    body.desc || body.text,
    ...(body.metrics || []).flatMap(item => [item.name, item.text]),
    ...sectionText(body), ...faqText(body),
    body.organ || body.connection,
    ...learningText,
  ]).join(" ");
  // The home page introduces the lead article with its opening visual.
  // Self-made diagrams and AI-generated editorial illustrations travel in the
  // summary; third-party assets keep their full attribution on the article page.
  const firstFigure = (body.figures || []).find(
    figure => figure.diagram || (figure.src && figure.attribution?.kind !== "third-party"),
  );
  const leadFigure = !firstFigure
    ? null
    : firstFigure.diagram
      ? { diagram: firstFigure.diagram, caption: clean(firstFigure.caption) }
      : {
          src: firstFigure.src,
          alt: clean(firstFigure.alt),
          caption: clean(firstFigure.caption),
          ...(firstFigure.width ? { width: firstFigure.width } : {}),
          ...(firstFigure.height ? { height: firstFigure.height } : {}),
          attribution: {
            kind: firstFigure.attribution.kind,
            name: clean(firstFigure.attribution.name),
            ...(firstFigure.attribution.model ? { model: clean(firstFigure.attribution.model) } : {}),
          },
        };
  return {
    id: body.id,
    kind,
    title,
    subtitle,
    question: kind === "organ" ? "" : clean(body.question),
    questionAnswer: kind === "organ" ? "" : clean(body.questionAnswer),
    english,
    icon: body.icon || "heart",
    color: body.color || "green",
    number: body.number || "",
    tags,
    category: body.category,
    format: body.format || (kind === "story" ? "article" : "entry"),
    featured: Boolean(body.featured),
    ...(leadFigure ? { leadFigure } : {}),
    searchText,
    sourceLabel: body.references?.[0]?.publisher || "",
    referenceCount: body.references?.length || 0,
  };
}

export async function buildCatalog() {
  const categories = JSON.parse(await readFile(path.join(contentDir, "categories.json"), "utf8"));
  const categoryIDs = new Set(categories.map(item => item.id));
  assert.equal(categoryIDs.size, categories.length, "category ids must be unique");
  const records = [];
  for (const kind of ["indicator", "organ", "story"]) {
    const files = (await readdir(path.join(contentDir, kind))).filter(file => file.endsWith(".json"));
    for (const file of files) {
      const body = JSON.parse(await readFile(path.join(contentDir, kind, file), "utf8"));
      assert.equal(file, `${body.id}.json`, `${file}: filename must match id`);
      assert.equal(body.kind, kind, `${file}: kind must be ${kind}`);
      assert.ok(Number.isFinite(body.catalogOrder), `${file}: catalogOrder is required`);
      assert.ok(categoryIDs.has(body.category), `${file}: unknown category ${body.category}`);
      records.push({ order: body.catalogOrder, item: summary(kind, body) });
    }
  }
  records.sort((a, b) => a.order - b.order || a.item.id.localeCompare(b.item.id));
  assert.equal(new Set(records.map(record => `${record.item.kind}:${record.item.id}`)).size, records.length, "content ids must be unique per kind");
  return { schemaVersion: 1, categories, items: records.map(record => record.item) };
}

const output = `${JSON.stringify(await buildCatalog(), null, 2)}\n`;
if (check) {
  const current = await readFile(indexPath, "utf8");
  assert.equal(current, output, "public/content/index.json is stale; run npm run content:build");
  console.log("Content catalog is current.");
} else {
  await writeFile(indexPath, output);
  console.log(`Generated ${indexPath}.`);
}
