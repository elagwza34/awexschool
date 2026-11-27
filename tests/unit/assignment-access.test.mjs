import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,export {}", shortCircuit: true };
    }
    if (specifier === "@/features/auth/supabase-server") {
      return { url: "data:text/javascript,export function ownerClient() { return null; }", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const { assignmentScope } = await import("../../src/features/dashboards/live-assignment-access.ts");

test("student assignment scope excludes enrollments for unpublished courses", async () => {
  const calls = [];
  const builder = {
    select(...args) { calls.push(["select", ...args]); return builder; },
    in(...args) { calls.push(["in", ...args]); return builder; },
    eq(...args) { calls.push(["eq", ...args]); return builder; },
    then(resolve, reject) {
      return Promise.resolve({
        data: [{ course_id: "11111111-1111-4111-8111-111111111111" }],
        error: null,
      }).then(resolve, reject);
    },
  };
  const client = { from: () => builder };
  const result = await assignmentScope(client, "student", "22222222-2222-4222-8222-222222222222");
  assert.deepEqual(result.ids, ["11111111-1111-4111-8111-111111111111"]);
  assert.deepEqual(calls, [
    ["select", "course_id,courses!inner(status)"],
    ["in", "student_id", ["22222222-2222-4222-8222-222222222222"]],
    ["eq", "status", "active"],
    ["eq", "courses.status", "published"],
  ]);
});

function tableClient(results) {
  const calls = [];
  return {
    calls,
    from(table) {
      calls.push(["from", table]);
      const result = results[table];
      assert.ok(result, `unexpected query for ${table}`);
      const builder = {
        select(...args) { calls.push(["select", ...args]); return builder; },
        in(...args) { calls.push(["in", ...args]); return builder; },
        eq(...args) { calls.push(["eq", ...args]); return builder; },
        then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
      };
      return builder;
    },
  };
}

test("parent assignment scope uses active linked students with current student roles", async () => {
  const parentId = "11111111-1111-4111-8111-111111111111";
  const childId = "22222222-2222-4222-8222-222222222222";
  const client = tableClient({
    guardian_links: { data: [{ student_id: childId, profiles: { status: "active" } }], error: null },
    account_roles: { data: [{ user_id: childId }], error: null },
    course_enrollments: { data: [{ course_id: "33333333-3333-4333-8333-333333333333" }], error: null },
  });

  const result = await assignmentScope(client, "parent", parentId);

  assert.deepEqual(result.ids, ["33333333-3333-4333-8333-333333333333"]);
  assert.deepEqual(result.students, [childId]);
  assert.deepEqual(client.calls, [
    ["from", "guardian_links"],
    ["select", "student_id,profiles!inner(status)"],
    ["eq", "guardian_id", parentId],
    ["eq", "profiles.status", "active"],
    ["from", "account_roles"],
    ["select", "user_id"],
    ["in", "user_id", [childId]],
    ["eq", "role_code", "student"],
    ["from", "course_enrollments"],
    ["select", "course_id,courses!inner(status)"],
    ["in", "student_id", [childId]],
    ["eq", "status", "active"],
    ["eq", "courses.status", "published"],
  ]);
});

test("parent assignment scope accepts the SDK array form of an active embedded profile", async () => {
  const parentId = "11111111-1111-4111-8111-111111111111";
  const childId = "22222222-2222-4222-8222-222222222222";
  const courseId = "33333333-3333-4333-8333-333333333333";
  const client = tableClient({
    guardian_links: { data: [{ student_id: childId, profiles: [{ status: "active" }] }], error: null },
    account_roles: { data: [{ user_id: childId }], error: null },
    course_enrollments: { data: [{ course_id: courseId }], error: null },
  });

  assert.deepEqual(await assignmentScope(client, "parent", parentId), {
    ids: [courseId], students: [childId], error: false,
  });
});

test("parent assignment scope excludes null embedded profiles and revoked student roles", async () => {
  const parentId = "11111111-1111-4111-8111-111111111111";
  const activeChild = "22222222-2222-4222-8222-222222222222";
  const disabledChild = "33333333-3333-4333-8333-333333333333";
  const revokedChild = "44444444-4444-4444-8444-444444444444";
  const client = tableClient({
    guardian_links: { data: [
      { student_id: activeChild, profiles: { status: "active" } },
      { student_id: disabledChild, profiles: null },
      { student_id: revokedChild, profiles: { status: "active" } },
    ], error: null },
    account_roles: { data: [{ user_id: activeChild }], error: null },
    course_enrollments: { data: [{ course_id: "55555555-5555-4555-8555-555555555555" }], error: null },
  });

  const result = await assignmentScope(client, "parent", parentId);

  assert.deepEqual(result, { ids: ["55555555-5555-4555-8555-555555555555"], students: [activeChild], error: false });
  assert.ok(client.calls.some(([operation, column, values]) =>
    operation === "in" && column === "student_id" && values.length === 1 && values[0] === activeChild
  ));
});

test("parent assignment scope does not query enrollments without active linked students", async () => {
  const parentId = "11111111-1111-4111-8111-111111111111";
  const client = tableClient({
    guardian_links: { data: [], error: null },
  });

  const result = await assignmentScope(client, "parent", parentId);

  assert.deepEqual(result, { ids: [], students: [], error: false });
  assert.deepEqual(client.calls, [
    ["from", "guardian_links"],
    ["select", "student_id,profiles!inner(status)"],
    ["eq", "guardian_id", parentId],
    ["eq", "profiles.status", "active"],
  ]);
});

test("teacher assignment scope includes published courses from active group assignments", async () => {
  const teacherId = "11111111-1111-4111-8111-111111111111";
  const ownedCourse = "22222222-2222-4222-8222-222222222222";
  const groupCourse = "33333333-3333-4333-8333-333333333333";
  const client = tableClient({
    courses: { data: [{ id: ownedCourse }], error: null },
    learning_groups: { data: [{ course_id: groupCourse }, { course_id: ownedCourse }], error: null },
  });

  const result = await assignmentScope(client, "teacher", teacherId);

  assert.deepEqual(result.ids, [ownedCourse, groupCourse]);
  assert.ok(client.calls.some((call) => call[0] === "from" && call[1] === "learning_groups"));
  assert.ok(client.calls.some((call) => call[0] === "eq" && call[1] === "teacher_id" && call[2] === teacherId));
  assert.ok(client.calls.some((call) => call[0] === "eq" && call[1] === "active" && call[2] === true));
  assert.ok(client.calls.some((call) => call[0] === "eq" && call[1] === "courses.status" && call[2] === "published"));
});
