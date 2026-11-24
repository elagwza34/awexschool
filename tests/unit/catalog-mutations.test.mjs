import assert from "node:assert/strict";
import test from "node:test";

import { readCoursePublication } from "../../src/features/catalog/catalog-mutations.ts";

function form(values) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
}

test("course publication accepts trimmed valid content and catalog references", () => {
  assert.deepEqual(readCoursePublication(form({
    title: "  Algebra foundations  ",
    description: "  A clear introductory course.  ",
    track: "arabic",
    grade: "preparatory-1",
    subject: "math",
  })), {
    title: "Algebra foundations",
    description: "A clear introductory course.",
    track: "arabic",
    grade: "preparatory-1",
    subject: "math",
  });
});

test("course publication rejects missing or malformed catalog references", () => {
  for (const values of [
    { grade: "", subject: "math" },
    { grade: "preparatory-1", subject: "" },
    { grade: "missing grade", subject: "math" },
    { grade: "preparatory-1", subject: "../math" },
  ]) {
    assert.equal(readCoursePublication(form({
      title: "Algebra foundations",
      description: "",
      track: "arabic",
      ...values,
    })), null);
  }
});

test("course publication enforces existing content limits and tracks", () => {
  const valid = {
    title: "Algebra foundations",
    description: "",
    track: "arabic",
    grade: "preparatory-1",
    subject: "math",
  };
  for (const values of [
    { title: "ab" },
    { title: "x".repeat(161) },
    { description: "x".repeat(3001) },
    { track: "science" },
  ]) {
    assert.equal(readCoursePublication(form({ ...valid, ...values })), null);
  }
});
