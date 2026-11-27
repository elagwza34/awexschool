import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {}", shortCircuit: true };
    return nextResolve(specifier, context);
  },
});

const { activeLinkedStudentIds } = await import("../../src/features/dashboards/guardian-learner-scope.ts");

const guardianId = "11111111-1111-4111-8111-111111111111";
const activeChild = "22222222-2222-4222-8222-222222222222";
const disabledChild = "33333333-3333-4333-8333-333333333333";
const revokedChild = "44444444-4444-4444-8444-444444444444";

function tableClient(results) {
  const calls = [];
  return {
    calls,
    from(table) {
      calls.push(["from", table]);
      assert.ok(results[table], `unexpected query for ${table}`);
      const builder = {
        select(...args) { calls.push(["select", ...args]); return builder; },
        in(...args) { calls.push(["in", ...args]); return builder; },
        eq(...args) { calls.push(["eq", ...args]); return builder; },
        then(resolve, reject) { return Promise.resolve(results[table]).then(resolve, reject); },
      };
      return builder;
    },
  };
}

test("guardian learner scope uses the explicit student relationship and current student role", async () => {
  const client = tableClient({
    guardian_links: { data: [
      { student_id: activeChild, profiles: { status: "active" } },
      { student_id: disabledChild, profiles: null },
      { student_id: revokedChild, profiles: [{ status: "active" }] },
    ], error: null },
    account_roles: { data: [{ user_id: activeChild }], error: null },
  });

  assert.deepEqual(await activeLinkedStudentIds(client, guardianId), { ids: [activeChild], error: false });
  assert.deepEqual(client.calls, [
    ["from", "guardian_links"],
    ["select", "student_id,profiles!guardian_links_student_id_fkey!inner(status)"],
    ["eq", "guardian_id", guardianId],
    ["eq", "profiles.status", "active"],
    ["from", "account_roles"],
    ["select", "user_id"],
    ["in", "user_id", [activeChild, revokedChild]],
    ["eq", "role_code", "student"],
  ]);
});

test("guardian learner scope removes revoked roles and duplicate links", async () => {
  const client = tableClient({
    guardian_links: { data: [
      { student_id: activeChild, profiles: { status: "active" } },
      { student_id: activeChild, profiles: [{ status: "active" }] },
      { student_id: revokedChild, profiles: { status: "active" } },
    ], error: null },
    account_roles: { data: [{ user_id: activeChild }], error: null },
  });

  assert.deepEqual(await activeLinkedStudentIds(client, guardianId), { ids: [activeChild], error: false });
});

test("guardian learner scope fails closed on link or role query errors", async () => {
  const linksFailed = tableClient({ guardian_links: { data: null, error: { message: "offline" } } });
  assert.deepEqual(await activeLinkedStudentIds(linksFailed, guardianId), { ids: [], error: true });
  assert.deepEqual(linksFailed.calls.filter(([operation]) => operation === "from").map(([, table]) => table), ["guardian_links"]);

  const rolesFailed = tableClient({
    guardian_links: { data: [{ student_id: activeChild, profiles: { status: "active" } }], error: null },
    account_roles: { data: null, error: { message: "offline" } },
  });
  assert.deepEqual(await activeLinkedStudentIds(rolesFailed, guardianId), { ids: [], error: true });
});

test("guardian learner scope does not query roles without active linked learners", async () => {
  const client = tableClient({ guardian_links: { data: [], error: null } });
  assert.deepEqual(await activeLinkedStudentIds(client, guardianId), { ids: [], error: false });
  assert.deepEqual(client.calls.filter(([operation]) => operation === "from").map(([, table]) => table), ["guardian_links"]);
});
