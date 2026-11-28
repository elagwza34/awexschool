import assert from "node:assert/strict";
import test from "node:test";
import { summarizeLessonProgress, progressPercentage } from "../../src/features/catalog/lesson-progress.ts";

test("completion percentage uses only visible lesson IDs and persisted completion markers", () => {
  assert.deepEqual(summarizeLessonProgress(["a", "b", "c"], new Set(["a", "d"])),
    { completed: 1, total: 3, percent: 33 });
  assert.deepEqual(summarizeLessonProgress([], new Set(["d"])),
    { completed: 0, total: 0, percent: null });
});
test("portal progress reports no percentage for a course without lessons", () => {
  assert.equal(progressPercentage(0, 0), null);
  assert.equal(progressPercentage(1, 3), 33);
  assert.equal(progressPercentage(3, 3), 100);
});
