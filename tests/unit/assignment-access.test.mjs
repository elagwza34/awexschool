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
    ["in", "requester_id", ["22222222-2222-4222-8222-222222222222"]],
    ["eq", "status", "active"],
    ["eq", "courses.status", "published"],
  ]);
});
