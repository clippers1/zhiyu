import test from "node:test";
import assert from "node:assert/strict";
import { nextIndicator, selectDiscovery } from "../src/services/discovery.js";

const question = (id, number = "", extra = {}) => ({
  id,
  kind: "indicator",
  title: id,
  number,
  question: `什么是${id}？`,
  questionAnswer: `${id}的解释`,
  ...extra,
});
const organ = id => ({ id, kind: "organ", title: id });

test("discovery selects one feature and a numbered index from published summaries", () => {
  const indicators = [
    question("gamma", "03"),
    question("alpha", "01"),
    question("beta", "02"),
  ];
  const result = selectDiscovery(indicators, [organ("lung"), organ("heart")]);
  assert.equal(result.feature.id, "alpha");
  assert.deepEqual(result.indexRows.map(item => item.id), ["beta", "gamma"]);
  assert.deepEqual(result.questions.map(item => item.id), ["alpha", "beta", "gamma"]);
  assert.deepEqual(result.organs.map(item => item.id), ["lung", "heart"]);
  assert.equal(result.organPreview.id, "lung");
  assert.equal(result.guideAvailable, true);
  assert.equal(result.totalIndicators, 3);
  assert.equal(result.totalOrgans, 2);
  assert.equal(indicators[0].id, "gamma", "input order is not mutated");
});

test("unreadable or absent summaries cannot create empty recommendations", () => {
  const result = selectDiscovery(
    [question("ok"), null, question("missing", "", { questionAnswer: "" }), question("../bad")],
    [organ("lung"), organ("lung")],
  );
  assert.deepEqual(result.questions.map(item => item.id), ["ok"]);
  assert.deepEqual(result.indexRows, []);
  assert.equal(result.guideAvailable, false);
  assert.deepEqual(result.organs.map(item => item.id), ["lung"]);
  const empty = {
    feature: null,
    indexRows: [],
    longForm: [],
    questions: [],
    stories: [],
    organs: [],
    organPreview: null,
    guideAvailable: false,
    totalIndicators: 0,
    totalOrgans: 0,
    totalStories: 0,
  };
  assert.deepEqual(selectDiscovery(), empty);
  assert.deepEqual(selectDiscovery({}, {}), empty);
});

test("long-form articles and stories lead the feature, and each entry appears once", () => {
  const indicators = [
    question("alpha", "01"),
    question("beta", "02", { format: "article" }),
    question("gamma", "03"),
  ];
  const stories = [
    { kind: "story", id: "stairs", title: "爬楼", question: "为什么爬楼心跳快？", questionAnswer: "因为要用氧。" },
    { kind: "story", id: "lab", title: "参考区间", question: "区间为什么不同？", questionAnswer: "因为人群和方法不同。" },
    { kind: "story", id: "broken", title: "", question: "", questionAnswer: "" },
  ];
  const result = selectDiscovery(indicators, [organ("heart")], stories);
  assert.equal(result.feature.id, "stairs");
  // The featured story is not repeated underneath; long-form entries fill the
  // editorial strip first, and the index picks up whatever it cannot hold.
  assert.deepEqual(result.longForm.map(item => item.id), ["lab", "beta"]);
  assert.deepEqual(result.indexRows.map(item => item.id), ["alpha", "gamma"]);
  assert.deepEqual(result.stories.map(item => item.id), ["stairs", "lab"]);
  assert.equal(result.totalStories, 2);
  assert.equal(result.totalIndicators, 3);
});

test("a long-form entry the strip cannot hold stays reachable in the index", () => {
  const indicators = ["01", "02", "03", "04", "05", "06"].map((number, index) =>
    question(`long${index}`, number, { format: "article" }),
  );
  const result = selectDiscovery(indicators, []);
  assert.equal(result.feature.id, "long0");
  // Three rows fill the strip; the rest appear once, in the index below.
  assert.deepEqual(result.longForm.map(item => item.id), ["long1", "long2", "long3"]);
  assert.deepEqual(result.indexRows.map(item => item.id), ["long4", "long5"]);
});

test("without stories or long-form articles the first numbered indicator leads", () => {
  const result = selectDiscovery([question("beta", "02"), question("alpha", "01")], []);
  assert.equal(result.feature.id, "alpha");
  assert.deepEqual(result.indexRows.map(item => item.id), ["beta"]);
  assert.deepEqual(result.longForm, []);
});

test("next entry follows catalog order and never wraps", () => {
  const items = [question("third", "03"), question("first", "01"), question("second", "02")];
  assert.equal(nextIndicator(items, "first").id, "second");
  assert.equal(nextIndicator(items, "second").id, "third");
  assert.equal(nextIndicator(items, "third"), null);
  assert.equal(nextIndicator(items, "unknown"), null);
  assert.equal(nextIndicator([], "first"), null);
});

test("stories page among themselves, never into the indicator index", () => {
  const stories = [
    { kind: "story", id: "a", question: "甲？", questionAnswer: "甲。" },
    { kind: "story", id: "b", question: "乙？", questionAnswer: "乙。" },
  ];
  assert.equal(nextIndicator(stories, "a", "story").id, "b");
  assert.equal(nextIndicator(stories, "b", "story"), null);
  assert.equal(nextIndicator(stories, "a"), null, "an indicator lookup must not see stories");
});
