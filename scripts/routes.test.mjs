import test from "node:test";
import assert from "node:assert/strict";
import { legacyRoutePath, parseRoute, routePath } from "../src/services/routes.js";

test("direct History URLs resolve including trailing slashes and default organ", () => {
  assert.deepEqual(parseRoute("/"), { page: "map", id: "" });
  assert.deepEqual(parseRoute("/article/glucose/"), { page: "article", id: "glucose" });
  assert.deepEqual(parseRoute("/organs"), { page: "organs", id: "heart" });
  assert.deepEqual(parseRoute("/organs/kidney"), { page: "organs", id: "kidney" });
  assert.equal(routePath("map"), "/");
  assert.equal(routePath("article", "glucose"), "/article/glucose");
});

test("invalid routes do not silently render the home page", () => {
  for (const path of ["/missing", "/article", "/saved/extra", "/article/glucose/extra", "/article/%2e%2e", "//organs", "/map/heart"]) {
    assert.equal(parseRoute(path).page, "not-found", path);
  }
  assert.throws(() => routePath("article", "../private"));
  assert.throws(() => routePath("article"));
  assert.throws(() => routePath("saved", "glucose"));
});

test("legacy shared links upgrade while ordinary citation fragments are preserved", () => {
  assert.equal(legacyRoutePath("#/article/glucose"), "/article/glucose");
  assert.equal(legacyRoutePath("#/organs/kidney"), "/organs/kidney");
  assert.equal(legacyRoutePath("#/map"), "/");
  assert.equal(legacyRoutePath("#article-source-tests"), null);
  assert.equal(legacyRoutePath("#/unknown"), null);
});
