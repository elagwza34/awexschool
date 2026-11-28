import assert from "node:assert/strict";
import test from "node:test";
import { parseCairoSessionStart } from "../../src/features/dashboards/session-time.ts";

test("session time uses Cairo wall time rather than the server timezone", () => {
  assert.equal(parseCairoSessionStart("2027-01-10T12:00"), "2027-01-10T10:00:00.000Z");
  assert.equal(parseCairoSessionStart("2027-07-10T12:00"), "2027-07-10T09:00:00.000Z");
  assert.equal(parseCairoSessionStart("2027-02-30T12:00"), null);
  assert.equal(parseCairoSessionStart("2027-01-10T12:00Z"), null);
});
