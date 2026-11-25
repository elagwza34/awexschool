import assert from "node:assert/strict";
import test from "node:test";

const { readTeacherSessionAccount } = await import("../../src/features/teachers/teacher-session.ts");
const userId = "22222222-2222-4222-8222-222222222222";

function client({ user = { id: userId, email: "user@example.com", email_confirmed_at: "2026-11-25T00:00:00Z" }, profile = { data: { display_name: "User", status: "active" }, error: null }, roles = { data: [{ role_code: "student" }], error: null } } = {}) {
  const calls = [];
  return {
    calls,
    auth: { async getUser() { calls.push(["auth.getUser"]); return { data: { user }, error: null }; } },
    from(table) {
      calls.push(["from", table]);
      const result = table === "profiles" ? profile : roles;
      const builder = {
        select(...args) { calls.push(["select", ...args]); return builder; },
        eq(...args) { calls.push(["eq", ...args]); return builder; },
        maybeSingle() { return Promise.resolve(result); },
        then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
      };
      return builder;
    },
  };
}

test("teacher session identity requires a confirmed Auth user", async () => {
  for (const user of [null, { id: userId, email: "user@example.com", email_confirmed_at: null }, { id: userId, email: null, email_confirmed_at: "2026-11-25T00:00:00Z" }]) {
    const session = client({ user });
    assert.equal(await readTeacherSessionAccount(session), null);
    assert.deepEqual(session.calls, [["auth.getUser"]]);
  }
});

test("teacher session identity fails closed on profile or role query errors and inactive profiles", async () => {
  for (const options of [
    { profile: { data: null, error: { message: "failed" } } },
    { roles: { data: null, error: { message: "failed" } } },
    { profile: { data: { display_name: "User", status: "suspended" }, error: null } },
    { profile: { data: null, error: null } },
  ]) {
    assert.equal(await readTeacherSessionAccount(client(options)), null);
  }
});

test("teacher session identity returns only active account roles for authorized callers", async () => {
  const session = client({ roles: { data: [{ role_code: "student" }, { role_code: "parent" }], error: null } });
  assert.deepEqual(await readTeacherSessionAccount(session), {
    user: { id: userId, email: "user@example.com", email_confirmed_at: "2026-11-25T00:00:00Z" },
    name: "User",
    roles: ["student", "parent"],
  });
  assert.equal(session.calls.some(([name, table]) => name === "from" && table === "profiles"), true);
  assert.equal(session.calls.some(([name, table]) => name === "from" && table === "account_roles"), true);
});
