import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import * as catalogData from "../../src/features/catalog/catalog-data.ts";
const {
  loadCatalogOptions,
  loadCourseEnrollments,
  loadEnrollmentLearners,
  loadPublishedCourse,
  loadPublishedCourses,
  resolveCourseEnrollment,
} = catalogData;
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

test("course enrollments preserve authoritative identities and visible legacy rows", async () => {
  const rows = [
    {
      course_id: "course-1",
      requester_id: "requester-1",
      student_id: "student-1",
      learner_name: "Name at request time",
      student: { display_name: "Current learner name" },
      status: "pending",
    },
    {
      course_id: "course-2",
      requester_id: "requester-1",
      student_id: null,
      learner_name: "Legacy learner",
      student: null,
      status: "active",
    },
  ];
  const client = clientWith({ course_enrollments: { data: rows, error: null } });
  assert.deepEqual(await loadCourseEnrollments(client), { state: "ready", data: rows });
  assert.deepEqual(client.calls, [
    ["from", "course_enrollments"],
    ["select", "course_enrollments", "course_id,requester_id,student_id,learner_name,status,student:profiles!course_enrollments_student_id_fkey(display_name)"],
    ["order", "course_enrollments", "created_at", { ascending: false }],
  ]);
  assert.deepEqual(await loadCourseEnrollments(clientWith({ course_enrollments: empty })), { state: "ready", data: [] });
});

test("catalog readers normalize embedded SDK relation arrays without dropping legacy rows", async () => {
  const enrollments = await loadCourseEnrollments(clientWith({
    course_enrollments: {
      data: [
        {
          course_id: "course-1", requester_id: "requester-1", student_id: "student-1",
          learner_name: "Stored name", status: "pending",
          student: [{ display_name: "Current name" }],
        },
        {
          course_id: "course-2", requester_id: "requester-1", student_id: null,
          learner_name: "Legacy learner", status: "active", student: [],
        },
      ],
      error: null,
    },
  }));
  assert.deepEqual(enrollments, {
    state: "ready",
    data: [
      {
        course_id: "course-1", requester_id: "requester-1", student_id: "student-1",
        learner_name: "Stored name", status: "pending", student: { display_name: "Current name" },
      },
      {
        course_id: "course-2", requester_id: "requester-1", student_id: null,
        learner_name: "Legacy learner", status: "active", student: null,
      },
    ],
  });

  const learners = await loadEnrollmentLearners(clientWith({
    guardian_links: {
      data: [
        { student_id: "student-1", profiles: [{ display_name: "Child", status: "active" }] },
        { student_id: "student-2", profiles: [] },
      ],
      error: null,
    },
  }), "guardian-1");
  assert.deepEqual(learners, {
    state: "ready",
    data: [{ student_id: "student-1", profiles: { display_name: "Child", status: "active" } }],
  });
});

test("linked enrollment learners come from guardian links with active profiles", async () => {
  assert.equal(typeof loadEnrollmentLearners, "function");
  const guardianId = "11111111-1111-4111-8111-111111111111";
  const rows = [{ student_id: "22222222-2222-4222-8222-222222222222", profiles: { display_name: "Child", status: "active" } }];
  const client = clientWith({ guardian_links: { data: rows, error: null } });

  assert.deepEqual(await loadEnrollmentLearners(client, guardianId), { state: "ready", data: rows });
  assert.deepEqual(client.calls, [
    ["from", "guardian_links"],
    ["select", "guardian_links", "student_id,profiles!guardian_links_student_id_fkey(display_name,status)"],
    ["eq", "guardian_links", "guardian_id", guardianId],
    ["eq", "guardian_links", "profiles.status", "active"],
  ]);
});

test("linked enrollment learner queries fail closed without configuration", async () => {
  assert.equal(typeof loadEnrollmentLearners, "function");
  assert.deepEqual(await loadEnrollmentLearners(null, "11111111-1111-4111-8111-111111111111"), {
    state: "error", kind: "configuration",
  });
});

function enrollmentRow(overrides = {}) {
  return {
    course_id: "course-1",
    requester_id: "requester-1",
    student_id: "student-1",
    learner_name: "Learner",
    student: { display_name: "Learner" },
    status: "pending",
    ...overrides,
  };
}

test("effective enrollment lets an active row beat a newer pending request for the same learner", () => {
  const active = enrollmentRow({ status: "active" });
  const newerPending = enrollmentRow({ requester_id: "guardian-1", status: "pending" });
  assert.equal(resolveCourseEnrollment([newerPending, active], "course-1", "student-1"), active);
});

test("effective enrollment preserves pending, declined, and legacy states for one learner", () => {
  const pending = enrollmentRow();
  const declined = enrollmentRow({ status: "declined" });
  const legacy = enrollmentRow({ student_id: null, requester_id: "student-1", status: "active" });
  assert.equal(resolveCourseEnrollment([pending], "course-1", "student-1"), pending);
  assert.equal(resolveCourseEnrollment([declined], "course-1", "student-1"), declined);
  assert.equal(resolveCourseEnrollment([legacy], "course-1", "student-1"), legacy);
  assert.equal(resolveCourseEnrollment([legacy], "course-1", "another-student"), undefined);
});

test("effective enrollment keeps sibling states independent", () => {
  const activeSibling = enrollmentRow({ student_id: "student-1", status: "active" });
  const pendingSibling = enrollmentRow({ student_id: "student-2", requester_id: "guardian-1" });
  const rows = [pendingSibling, activeSibling];
  assert.equal(resolveCourseEnrollment(rows, "course-1", "student-1"), activeSibling);
  assert.equal(resolveCourseEnrollment(rows, "course-1", "student-2"), pendingSibling);
});

test("effective enrollment uses learner identity rather than requester or display identity", () => {
  const unrelated = enrollmentRow({ requester_id: "student-1", student_id: "student-2", status: "active" });
  const otherCourse = enrollmentRow({ course_id: "course-2", status: "active" });
  assert.equal(resolveCourseEnrollment([unrelated, otherCourse], "course-1", "student-1"), undefined);
});

test("effective enrollment ignores unsupported request states", () => {
  assert.equal(resolveCourseEnrollment([enrollmentRow({ status: "expired" })], "course-1", "student-1"), undefined);
});

test("public groups preserve only successful empty results", async () => {
  assert.deepEqual(await loadPublicGroups(clientWith({ learning_groups: empty })), { state: "ready", data: [] });
  assert.deepEqual(await loadPublicGroups(clientWith({
    learning_groups: { data: null, error: { message: "Failed to fetch" } },
  })), { state: "error", kind: "network" });
});

test("published catalog search matches a course, subject, or teacher within selected filters", () => {
  const courses = [
    { id: "a", title: "Algebra", grade_id: "grade-1", subject_id: "math", track: "arabic", subjects: [{ name: "Mathematics" }], teacher_profiles: { full_name: "Mona Ali" } },
    { id: "b", title: "Geometry", grade_id: "grade-2", subject_id: "math", track: "languages", subjects: { name: "Mathematics" }, teacher_profiles: null },
  ];
  assert.deepEqual(catalogData.filterPublishedCatalog(courses, { q: " mona ", grade: "grade-1", subject: "math" }).map(({ id }) => id), ["a"]);
  assert.deepEqual(catalogData.filterPublishedCatalog(courses, { q: "MATHEMATICS", grade: "", subject: "math", track: "languages" }).map(({ id }) => id), ["b"]);
  assert.deepEqual(catalogData.filterPublishedCatalog(courses, { q: "Algebra", grade: "grade-2", subject: "" }), []);
});
