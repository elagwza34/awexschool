import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const state = {};
globalThis.__phase02AuthState = state;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/navigation") {
      return {
        url: `data:text/javascript,
          export function redirect(location) {
            const error = new Error('redirect');
            error.name = 'Phase02Redirect';
            error.location = location;
            throw error;
          }
        `,
        shortCircuit: true,
      };
    }
    if (specifier === "@supabase/supabase-js") {
      return {
        url: "data:text/javascript,export function createClient() { return globalThis.__phase02AuthState.recoveryClient; }",
        shortCircuit: true,
      };
    }
    if (specifier === "./supabase-server") {
      return {
        url: `data:text/javascript,
          export function authConfig() { return globalThis.__phase02AuthState.authConfig; }
          export async function sessionClient() { return globalThis.__phase02AuthState.sessionClient; }
          export function ownerClient() {
            globalThis.__phase02AuthState.ownerClientCalls += 1;
            return globalThis.__phase02AuthState.admin;
          }
          export async function getAccount() { return globalThis.__phase02AuthState.account; }
        `,
        shortCircuit: true,
      };
    }
    if (specifier === "@/lib/mutation-result") {
      return {
        url: "data:text/javascript,export function mutationOutcome(result) { return result.error || !result.data ? 'failed' : 'saved'; }",
        shortCircuit: true,
      };
    }
    if (specifier.startsWith("./") && !specifier.endsWith(".ts")) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { addUser, resetPassword, signOut, verifySignupCode } = await import("../../src/features/auth/account-actions.ts");
const previousOwnerEmail = process.env.LIVESCHOOL_OWNER_EMAIL;
const previousFetch = globalThis.fetch;

function form(values = {}) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
}

async function redirected(action, values) {
  try {
    await action(form(values));
  } catch (error) {
    if (error?.name === "Phase02Redirect") return error.location;
    throw error;
  }
  assert.fail("expected a redirect");
}

function ownerAdmin() {
  const calls = [];
  state.admin = {
    calls,
    auth: {
      admin: {
        async createUser(input) {
          calls.push(["createUser", input]);
          return { data: { user: { id: "22222222-2222-4222-8222-222222222222" } }, error: null };
        },
        async deleteUser(id) {
          calls.push(["deleteUser", id]);
          return { error: null };
        },
      },
    },
    async rpc(name, args) {
      calls.push(["rpc", name, args]);
      return { data: true, error: null };
    },
  };
  return state.admin;
}

test.beforeEach(() => {
  Object.assign(state, {
    authConfig: { url: "http://127.0.0.1:54321", key: "test-key" },
    sessionClient: null,
    recoveryClient: null,
    admin: null,
    account: { roles: ["owner"] },
    ownerClientCalls: 0,
  });
  delete process.env.LIVESCHOOL_OWNER_EMAIL;
});

test.after(() => {
  if (previousOwnerEmail === undefined) delete process.env.LIVESCHOOL_OWNER_EMAIL;
  else process.env.LIVESCHOOL_OWNER_EMAIL = previousOwnerEmail;
  globalThis.fetch = previousFetch;
});

test("owner-created accounts reject passwords above the 72-byte Auth limit", async () => {
  const admin = ownerAdmin();
  const location = await redirected(addUser, {
    name: "Test Student",
    email: "student@example.test",
    password: "é".repeat(37),
    role: "student",
  });

  assert.equal(location, "/account?message=invalid");
  assert.deepEqual(admin.calls, []);
});

test("owner-created accounts preserve a password exactly at the 72-byte limit", async () => {
  const admin = ownerAdmin();
  const location = await redirected(addUser, {
    name: "Test Student",
    email: "student@example.test",
    password: "é".repeat(36),
    role: "student",
  });

  assert.equal(location, "/account?message=added");
  assert.equal(admin.calls[0][0], "createUser");
  assert.equal(admin.calls[0][1].password, "é".repeat(36));
});

test("password reset reports a failure to revoke existing sessions", async () => {
  const calls = [];
  state.recoveryClient = {
    auth: {
      async verifyOtp() { calls.push(["verifyOtp"]); return { error: null }; },
      async updateUser() { calls.push(["updateUser"]); return { error: null }; },
      async signOut(options) { calls.push(["signOut", options]); return { error: new Error("revocation failed") }; },
    },
  };

  const location = await redirected(resetPassword, {
    email: "student@example.test",
    code: "123456",
    password: "local-test-password",
    confirmPassword: "local-test-password",
  });

  assert.equal(location, "/login?message=revoke");
  assert.deepEqual(calls.at(-1), ["signOut", { scope: "global" }]);
});

test("password reset confirms success only after global sign-out succeeds", async () => {
  state.recoveryClient = {
    auth: {
      async verifyOtp() { return { error: null }; },
      async updateUser() { return { error: null }; },
      async signOut(options) {
        assert.deepEqual(options, { scope: "global" });
        return { error: null };
      },
    },
  };

  const location = await redirected(resetPassword, {
    email: "student@example.test",
    code: "123456",
    password: "local-test-password",
    confirmPassword: "local-test-password",
  });

  assert.equal(location, "/login?message=reset");
});

test("ordinary sign-out reports provider failure instead of claiming success", async () => {
  state.sessionClient = { auth: { async signOut() { return { error: new Error("sign-out failed") }; } } };

  const location = await redirected(signOut);

  assert.equal(location, "/account?message=signout-failed");
});

test("ordinary sign-out retains its successful account redirect", async () => {
  state.sessionClient = { auth: { async signOut() { return { error: null }; } } };

  assert.equal(await redirected(signOut), "/account");
});

test("OTP confirmation bootstraps the configured owner through the guarded RPC", async () => {
  process.env.LIVESCHOOL_OWNER_EMAIL = " Owner@Example.com ";
  const admin = ownerAdmin();
  state.authConfig = { url: "http://127.0.0.1:54321", key: "test-key" };
  state.sessionClient = {
    auth: {
      async verifyOtp() {
        return {
          data: { user: {
            id: "11111111-1111-4111-8111-111111111111",
            email: "owner@example.com",
            email_confirmed_at: "2026-11-26T00:00:00Z",
          } },
          error: null,
        };
      },
    },
  };
  globalThis.fetch = async () => ({
    ok: true,
    async json() { return { mailer_autoconfirm: false }; },
  });

  const location = await redirected(verifySignupCode, { email: "owner@example.com", code: "123456" });

  assert.equal(location, "/account");
  assert.deepEqual(admin.calls, [["rpc", "assign_owner_role", {
    account_id: "11111111-1111-4111-8111-111111111111",
  }]]);
});

test("OTP confirmation does not bootstrap an unconfigured or non-owner account", async () => {
  const admin = ownerAdmin();
  state.sessionClient = {
    auth: {
      async verifyOtp() {
        return { data: { user: {
          id: "11111111-1111-4111-8111-111111111111",
          email: "student@example.test",
          email_confirmed_at: "2026-11-26T00:00:00Z",
        } }, error: null };
      },
    },
  };

  const location = await redirected(verifySignupCode, { email: "student@example.test", code: "123456" });

  assert.equal(location, "/account");
  assert.deepEqual(admin.calls, []);
  assert.equal(state.ownerClientCalls, 0);
});
