import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { buildStructuredData, serializeJsonLd } from "../src/services/structured-data.js";
import { buildDoctorChecklistItems, formatChecklistText } from "../src/services/doctor-checklist.js";
import { GLOSSARY_ITEMS } from "../src/services/glossary.js";
import { GUIDE_FAQ } from "../src/services/report-guide.js";

const ORIGIN = "https://zhiyu.anron.fun";

test("structured data emits WebSite SearchAction on official homepage and suppresses demo/saved", () => {
  const home = buildStructuredData({ channel: "official", route: { page: "map", id: "" }, canonical: `${ORIGIN}/` }, ORIGIN);
  assert.ok(home);
  const site = home["@graph"].find((n) => n["@type"] === "WebSite");
  assert.equal(site.url, ORIGIN);
  assert.match(site.potentialAction.target, /\/indicators\?q=\{search_term_string\}$/);

  assert.equal(buildStructuredData({ channel: "demo", route: { page: "map", id: "" } }, ORIGIN), null);
  assert.equal(buildStructuredData({ channel: "official", route: { page: "saved", id: "" } }, ORIGIN), null);
});

test("structured data emits MedicalWebPage + FAQPage + BreadcrumbList for published articles", async () => {
  const detail = JSON.parse(await fs.readFile("public/content/indicator/hepatitis-b.json", "utf8"));
  const data = buildStructuredData(
    {
      channel: "official",
      route: { page: "article", id: "hepatitis-b" },
      canonical: `${ORIGIN}/article/hepatitis-b`,
      detail,
    },
    ORIGIN,
  );
  const webPage = data["@graph"].find((n) => n["@type"] === "MedicalWebPage");
  const faq = data["@graph"].find((n) => n["@type"] === "FAQPage");
  const crumbs = data["@graph"].find((n) => n["@type"] === "BreadcrumbList");
  assert.ok(webPage && faq && crumbs);
  assert.equal(webPage.image, `${ORIGIN}/media/fig-hepatitis-b.webp`);
  assert.equal(webPage.citation.length, detail.references.length);
  assert.equal(faq.mainEntity.length, detail.faq.length);
  assert.equal(crumbs.itemListElement.length, 3);
});

test("structured data emits DefinedTermSet for glossary and FAQPage for guide", () => {
  const glossary = buildStructuredData(
    { channel: "official", route: { page: "glossary", id: "" }, canonical: `${ORIGIN}/glossary` },
    ORIGIN,
  );
  const termSet = glossary["@graph"].find((n) => n["@type"] === "DefinedTermSet");
  assert.equal(termSet.hasDefinedTerm.length, GLOSSARY_ITEMS.length);

  const guide = buildStructuredData(
    { channel: "official", route: { page: "guide", id: "" }, canonical: `${ORIGIN}/guide` },
    ORIGIN,
  );
  const guideFaq = guide["@graph"].find((n) => n["@type"] === "FAQPage");
  assert.equal(guideFaq.mainEntity.length, GUIDE_FAQ.length);
});

test("serializeJsonLd strictly escapes script-breaking characters", () => {
  const serialized = serializeJsonLd({ text: "</script><script>alert(1)&</script>" });
  assert.doesNotMatch(serialized, /<\/script>/i);
  assert.doesNotMatch(serialized, /[<>]/);
  assert.equal(JSON.parse(serialized).text, "</script><script>alert(1)&</script>");
});

test("doctor visit checklist builds threshold-free tailored questions and clean copy text", async () => {
  const detail = JSON.parse(await fs.readFile("public/content/indicator/hepatitis-b.json", "utf8"));
  const bundle = buildDoctorChecklistItems(detail, [{ title: "肝功能" }, { title: "脂肪肝" }], ["乙肝表面抗原（HBsAg）"]);
  assert.equal(bundle.questions.length, 5);
  assert.equal(bundle.preps.length, 3);
  const text = formatChecklistText(detail.title, bundle.questions.slice(0, 2), bundle.preps);
  assert.match(text, /乙肝两对半/);
  assert.match(text, /肝功能、脂肪肝/);
  assert.match(text, /不含个人检查数值或医学诊断结论/);
  assert.doesNotMatch(text, /\d+(\.\d+)?\s*(mmol\/L|mmHg|U\/L|ng\/mL)/i);
  assert.deepEqual(buildDoctorChecklistItems({ kind: "story", id: "lab-range" }), []);
});
