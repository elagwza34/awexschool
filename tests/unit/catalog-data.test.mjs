import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import {
  loadCatalogOptions,
  loadCourseEnrollments,
  loadPublishedCourse,
  loadPublishedCourses,
} from "../../src/features/catalog/catalog-data.ts";
import { loadPublicGroups } from "../../src/features/catalog/public-groups-data.ts";

function clientWith(results) {
  const calls = [];
  return {
    calls,
    from(table) {
      calls.push(["from", table]);
      const result = results[table];
      assert.ok(result, `unexpected query for ${table}`);
      const builder = {
        select(...args) { calls.push(["select", table, ...args]); return builder; },
        order(...args) { calls.push(["order", table, ...args]); return builder; },
        eq(...args) { calls.push(["eq", table, ...args]); return builder; },
        in(...args) { calls.push(["in", table, ...args]); return builder; },
        maybeSingle() { calls.push(["maybeSingle", table]); return Promise.resolve(result); },
        then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
      };
      return builder;
    },
  };
}

function sdkClient(fetch) {
  return createClient("http://127.0.0.1:54321", "local-test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch },
  });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const empty = { data: [], error: null };

test("catalog options preserve populated and successfully empty results", async () => {
  const populated = clientWith({
    grades: { data: [{ id: "grade-1", name: "First" }], error: null },
    subjects: empty,
  });
  assert.deepEqual(await loadCatalogOptions(populated), {
    state: "ready",
    data: { grades: [{ id: "grade-1", name: "First" }], subjects: [] },
  });
});

test("catalog option query failures have no fallback data", async () => {
  const result = await loadCatalogOptions(clientWith({
    grades: { data: null, error: { code: "42501" } },
    subjects: empty,
  }));
  assert.deepEqual(result, { state: "error", kind: "permission" });
  assert.equal("data" in result, false);
});

test("published course queries distinguish query errors from empty lists", async () => {
  assert.deepEqual(await loadPublishedCourses(clientWith({ courses: empty })), { state: "ready", data: [] });
  assert.deepEqual(await loadPublishedCourses(clientWith({
    courses: { data: null, error: new TypeError("fetch failed") },
  })), { state: "error", kind: "network" });
});

test("course lookup validates identifiers before querying", async () => {
  const client = clientWith({});
  assert.deepEqual(await loadPublishedCourse(client, "invalid id!"), { state: "ready", data: null });
  assert.equal(client.calls.length, 0);
});

test("course lookup preserves one real row returned by the installed SDK", async () => {
  const course = { id: "11111111-1111-4111-8111-111111111111", title: "Real course" };
  const requests = [];
  const client = sdkClient(async (request) => {
    requests.push(typeof request === "string" ? request : request.url);
    return jsonResponse([course]);
  });
  assert.deepEqual(await loadPublishedCourse(client, "math-prep-1"), { state: "ready", data: course });
  assert.match(requests[0], /slug=eq\.math-prep-1/);
  assert.match(requests[0], /status=eq\.published/);
});

test("course lookup treats the SDK's successful zero-row maybeSingle result as missing", async () => {
  const client = sdkClient(async () => jsonResponse([]));
  assert.deepEqual(await loadPublishedCourse(client, "math-prep-1"), { state: "ready", data: null });
});

test("course lookup reports the SDK's PGRST116 multiple-row response as a database error", async () => {
  const client = sdkClient(async () => jsonResponse({
    code: "PGRST116",
    message: "JSON object requested, multiple (or no) rows returned",
    details: "The result contains 2 rows",
    hint: null,
  }, 406));
  assert.deepEqual(await loadPublishedCourse(client, "math-prep-1"), { state: "error", kind: "database" });
});

test("course lookup reports an SDK permission response as a permission error", async () => {
  const client = sdkClient(async () => jsonResponse({
    code: "42501",
    message: "permission denied for table courses",
    details: null,
    hint: null,
  }, 403));
  assert.deepEqual(await loadPublishedCourse(client, "math-prep-1"), { state: "error", kind: "permission" });
});

test("course lookup reports an SDK fetch failure as a network error", async () => {
  const client = sdkClient(async () => { throw new TypeError("fetch failed"); });
  assert.deepEqual(await loadPublishedCourse(client, "math-prep-1"), { state: "error", kind: "network" });
});

test("course enrollments never convert missing configuration or query errors into empty lists", async () => {
  assert.deepEqual(await loadCourseEnrollments(null), { state: "error", kind: "configuration" });
  const result = await loadCourseEnrollments(clientWith({
    course_enrollments: { data: null, error: { code: "42501" } },
  }));
  assert.deepEqual(result, { state: "error", kind: "permission" });
  assert.equal("data" in result, false);
});

test("course enrollments preserve successful rows and empty results", async () => {
  const rows = [{ course_id: "course-1", learner_name: "Learner", status: "pending" }];
  assert.deepEqual(await loadCourseEnrollments(clientWith({ course_enrollments: { data: rows, error: null } })), {
    state: "ready", data: rows,
  });
  assert.deepEqual(await loadCourseEnrollments(clientWith({ course_enrollments: empty })), { state: "ready", data: [] });
});

test("public groups preserve only successful empty results", async () => {
  assert.deepEqual(await loadPublicGroups(clientWith({ learning_groups: empty })), { state: "ready", data: [] });
  assert.deepEqual(await loadPublicGroups(clientWith({
    learning_groups: { data: null, error: { message: "Failed to fetch" } },
  })), { state: "error", kind: "network" });
});
