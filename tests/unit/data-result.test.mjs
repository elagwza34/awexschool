import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyDataError,
  configurationFailure,
  dataFailure,
  dataReady,
} from "../../src/lib/data-result.ts";

test("ready data preserves populated and empty results without an error state", () => {
  assert.deepEqual(dataReady([{ id: "real" }]), { state: "ready", data: [{ id: "real" }] });
  assert.deepEqual(dataReady([]), { state: "ready", data: [] });
});

test("query failures remain distinct from ready empty data", () => {
  const result = dataFailure({ code: "42501", message: "permission denied" });
  assert.deepEqual(result, { state: "error", kind: "permission" });
  assert.equal("data" in result, false);
});

test("classifies permission errors separately from database errors", () => {
  assert.equal(classifyDataError({ code: "42501", message: "row-level security" }), "permission");
  assert.equal(classifyDataError({ code: "23505", message: "duplicate key" }), "database");
  assert.equal(classifyDataError({ code: "PGRST116", message: "no rows" }), "database");
});

test("classifies fetch and network failures without exposing error details", () => {
  assert.equal(classifyDataError(new TypeError("fetch failed")), "network");
  assert.equal(classifyDataError(new Error("NetworkError when attempting to fetch resource")), "network");
  assert.equal(classifyDataError({ message: "Failed to fetch" }), "network");
});

test("missing required configuration is not reported as an empty successful query", () => {
  assert.deepEqual(configurationFailure(), { state: "error", kind: "configuration" });
});
