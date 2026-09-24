import test from "node:test";
import assert from "node:assert/strict";
import { selectDiscovery } from "../src/services/discovery.js";

const question = (id, featured = false) => ({ id, kind: "indicator", title: id, question: `什么是${id}？`, questionAnswer: `${id}的解释`, featured });
const organ = id => ({ id, kind: "organ", title: id });

test("home questions are bounded and the reading entrance requires real content", () => {
  const indicators = [question("delta"), question("bravo", true), question("alpha", true), question("charlie"), question("bravo", true)];
  const result = selectDiscovery(indicators, [organ("lung"), organ("heart")]);
  assert.deepEqual(result.questions.map(item => item.id), ["alpha", "bravo", "charlie"]);
  assert.equal(result.guideAvailable, true);
  assert.equal(result.organPreview.id, "heart");
  assert.equal(indicators[0].id, "delta");
});

test("unreadable or absent summaries cannot create empty recommendations", () => {
  const result = selectDiscovery([question("ok"), null, { ...question("missing"), questionAnswer: "" }, question("../bad")], [organ("lung"), organ("lung")]);
  assert.deepEqual(result.questions.map(item => item.id), ["ok"]);
  assert.equal(result.guideAvailable, false);
  assert.equal(result.organPreview.id, "lung");
  assert.deepEqual(selectDiscovery(), { questions: [], guideAvailable: false, organPreview: null });
  assert.deepEqual(selectDiscovery({}, {}), { questions: [], guideAvailable: false, organPreview: null });
});
