import assert from "node:assert/strict";
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

test("guardian learner scope queries only the signed-in guardian's RLS-filtered links", async () => {
  const client = tableClient({ guardian_links: { data: [{ student_id: activeChild }], error: null } });
  assert.deepEqual(await activeLinkedStudentIds(client, guardianId), { ids: [activeChild], error: false });
  assert.deepEqual(client.calls, [
    ["from", "guardian_links"],
    ["select", "student_id"],
    ["eq", "guardian_id", guardianId],
  ]);
});

test("guardian learner scope deduplicates policy-visible links", async () => {
  const client = tableClient({
    guardian_links: { data: [{ student_id: activeChild }, { student_id: activeChild }], error: null },
  });
  assert.deepEqual(await activeLinkedStudentIds(client, guardianId), { ids: [activeChild], error: false });
});

test("guardian learner scope fails closed on a policy query error", async () => {
  const client = tableClient({ guardian_links: { data: null, error: { message: "offline" } } });
  assert.deepEqual(await activeLinkedStudentIds(client, guardianId), { ids: [], error: true });
});

test("guardian learner scope returns no IDs when the policy exposes no links", async () => {
  const client = tableClient({ guardian_links: { data: [], error: null } });
  assert.deepEqual(await activeLinkedStudentIds(client, guardianId), { ids: [], error: false });
});
