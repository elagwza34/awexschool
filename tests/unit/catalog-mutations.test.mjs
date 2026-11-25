import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  applyEnrollmentReview,
  readCoursePublication,
  readEnrollmentReview,
} from "../../src/features/catalog/catalog-mutations.ts";

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

test("enrollment review accepts only real identifiers and supported transitions", () => {
  const course = "11111111-1111-4111-8111-111111111111";
  const requester = "22222222-2222-4222-8222-222222222222";
  assert.deepEqual(readEnrollmentReview(course, requester, form({ status: "active" })), {
    course, requester, status: "active",
  });
  assert.equal(readEnrollmentReview("fixture-course", requester, form({ status: "active" })), null);
  assert.equal(readEnrollmentReview(course, requester, form({ status: "pending" })), null);
});

test("enrollment activation delegates the atomic state check to the database", async () => {
  const calls = [];
  const client = {
    async rpc(name, args) {
      calls.push([name, args]);
      return { data: true, error: null };
    },
  };
  const review = {
    course: "11111111-1111-4111-8111-111111111111",
    requester: "22222222-2222-4222-8222-222222222222",
    status: "active",
  };
  assert.equal(await applyEnrollmentReview(client, review), "saved");
  assert.deepEqual(calls, [["review_course_enrollment_as_admin", {
    p_course: review.course,
    p_requester: review.requester,
    p_status: "active",
  }]]);
});

test("enrollment review distinguishes rejected transitions from database failures", async () => {
  const review = {
    course: "11111111-1111-4111-8111-111111111111",
    requester: "22222222-2222-4222-8222-222222222222",
    status: "active",
  };
  assert.equal(await applyEnrollmentReview({ rpc: async () => ({ data: false, error: null }) }, review), "not_found");
  assert.equal(await applyEnrollmentReview({ rpc: async () => ({ data: null, error: { message: "failed" } }) }, review), "failed");
});

test("the enrollment RPC locks authorized state before activation", () => {
  const sql = readFileSync(new URL("../../01_FULL_DATABASE_MIGRATION.sql", import.meta.url), "utf8");
  assert.match(sql, /create or replace function public\.review_course_enrollment_as_admin/i);
  assert.match(sql, /actor_id uuid := \(select auth\.uid\(\)\)/i);
  assert.match(sql, /from public\.courses(?:\s+c)?\s+where\s+(?:c\.)?id = p_course\s+for update/i);
  assert.match(sql, /from public\.course_enrollments[\s\S]*?for update/i);
  assert.match(sql, /enrollment\.status <> 'pending'/i);
  assert.match(sql, /p_status = 'active'[\s\S]*?course_status <> 'published'/i);
  assert.match(sql, /grant execute on function public\.review_course_enrollment_as_admin[\s\S]*?to authenticated/i);
  assert.doesNotMatch(sql, /grant execute on function public\.review_course_enrollment_as_admin\([^;]*to service_role/i);
});
