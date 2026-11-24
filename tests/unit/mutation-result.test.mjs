import assert from "node:assert/strict";
import test from "node:test";

import { mutationOutcome } from "../../src/lib/mutation-result.ts";

test("a mutation with an error cannot report success even when data is present", () => {
  assert.equal(mutationOutcome({ data: { id: "course-1" }, error: new Error("failed") }), "failed");
});

test("a successful query with no returned row is not a successful mutation", () => {
  for (const data of [null, undefined, [], false, 0, ""]) {
    assert.equal(mutationOutcome({ data, error: null }), "not_found");
  }
});

test("a returned object or nonempty row confirms a successful mutation", () => {
  assert.equal(mutationOutcome({ data: { id: "course-1" }, error: null }), "saved");
  assert.equal(mutationOutcome({ data: [{ id: "course-1" }], error: null }), "saved");
});
