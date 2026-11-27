import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { registerHooks } from "node:module";
import test from "node:test";

const applicationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const adminId = "33333333-3333-4333-8333-333333333333";
const challengeId = "44444444-4444-4444-8444-444444444444";

globalThis.__teacherAccount = null;
globalThis.__teacherCaptcha = true;
globalThis.__teacherSessionClient = null;
globalThis.__teacherOwnerClient = null;
globalThis.__teacherSessionCalls = [];
globalThis.__teacherOwnerCalls = 0;
globalThis.__teacherCaptchaCalls = [];
globalThis.__teacherChallenges = [];

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/navigation") {
      return {
        url: "data:text/javascript,export function redirect(url) { throw new Error(`redirect:${url}`); }",
        shortCircuit: true,
      };
    }
    if (specifier === "@/lib/mutation-result") {
      return {
        url: "data:text/javascript,export function mutationOutcome(result) { return result.error || !result.data ? 'failed' : 'saved'; }",
        shortCircuit: true,
      };
    }
    if (specifier === "@/features/auth/supabase-server") {
      return {
        url: `data:text/javascript,
          export async function getAccount() { return globalThis.__teacherAccount; }
          export async function sessionClient(writable) {
            globalThis.__teacherSessionCalls.push(writable);
            return globalThis.__teacherSessionClient;
          }
          export function ownerClient() {
            globalThis.__teacherOwnerCalls += 1;
            return globalThis.__teacherOwnerClient;
          }
        `,
        shortCircuit: true,
      };
    }
    if (specifier === "@/features/teachers/teacher-session" || specifier === "./teacher-session") {
      return {
        url: "data:text/javascript,export async function readTeacherSessionAccount() { const account = globalThis.__teacherAccount; return account?.user?.email && account.user.email_confirmed_at ? account : null; }",
        shortCircuit: true,
      };
    }
    if (specifier === "@/features/teachers/teacher-intake-security" || specifier === "./teacher-intake-security") {
      return {
        url: `data:text/javascript,
          import { createHash } from 'node:crypto';
          export async function verifyTeacherCaptcha(token, action) {
            globalThis.__teacherCaptchaCalls.push([token, action]);
            return globalThis.__teacherCaptcha;
          }
          export async function readTrustedRequestIp() { return '203.0.113.9'; }
          export function buildTeacherIntakeChallenge(input) {
            globalThis.__teacherChallenges.push(input);
            return {
              id: '${challengeId}', purpose: input.purpose, actor_id: input.actorId ?? null,
              ip_hash: createHash('sha256').update(input.ip ?? 'unknown').digest('hex'),
              application_id: input.applicationId ?? null,
              email_hash: input.email ? createHash('sha256').update(input.email.trim().toLowerCase()).digest('hex') : null,
              expires_at: new Date(Date.now() + 600000).toISOString(),
            };
          }
        `,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const actions = await import("../../src/features/teachers/application-actions.ts");
const { onboardTeacher } = await import("../../src/features/teachers/teacher-onboarding-actions.ts");

function form(values) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (key !== "grades") result.set(key, value);
  }
  for (const grade of values.grades ?? []) result.append("grades", grade);
  return result;
}

function applicationForm(overrides = {}) {
  return form({
    fullName: "مدرس تجريبي",
    displayName: "مدرس تجريبي",
    email: "attacker@example.com",
    password: "a-secure-password",
    subject: "math",
    phone: "01000000000",
    qualification: "بكالوريوس تربية",
    governorate: "القاهرة",
    experience: "5",
    bio: "أشرح الرياضيات بأمثلة من الحياة اليومية.",
    approach: "أمثلة تطبيقية وتمارين متدرجة.",
    video: "",
    captchaToken: "verified-token",
    grades: ["primary-1", "primary-2"],
    ...overrides,
  });
}

function queryResult(result, calls, table, insertThrows = false) {
  const builder = {
    select(...args) { calls.push(["select", table, ...args]); return builder; },
    insert(value) {
      calls.push(["insert", table, value]);
      if (insertThrows) throw new TypeError("ambiguous insert transport failure");
      return builder;
    },
    update(value) { calls.push(["update", table, value]); return builder; },
    eq(...args) { calls.push(["eq", table, ...args]); return builder; },
    in(...args) { calls.push(["in", table, ...args]); return builder; },
    is(...args) { calls.push(["is", table, ...args]); return builder; },
    order(...args) { calls.push(["order", table, ...args]); return builder; },
    maybeSingle() { calls.push(["maybeSingle", table]); return Promise.resolve(result); },
    single() { calls.push(["single", table]); return Promise.resolve(result); },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
  };
  return builder;
}

function fakeClient({ user = null, results = {}, rpcResult = { data: true, error: null }, createdUser = null, deleteError = null, insertThrows = false } = {}) {
  const calls = [];
  return {
    calls,
    auth: {
      async getUser() { calls.push(["auth.getUser"]); return { data: { user }, error: null }; },
      admin: {
        async createUser(value) {
          calls.push(["auth.admin.createUser", value]);
          return createdUser === null
            ? { data: { user: { id: userId, email: "teacher@example.com" } }, error: null }
            : createdUser;
        },
        async deleteUser(id) { calls.push(["auth.admin.deleteUser", id]); return { error: deleteError }; },
      },
    },
    from(table) {
      calls.push(["from", table]);
      return queryResult(results[table] ?? { data: null, error: null }, calls, table, insertThrows);
    },
    async rpc(name, args) { calls.push(["rpc", name, args]); return rpcResult; },
  };
}

function account(roles = ["student"], overrides = {}) {
  return {
    user: { id: userId, email: "Student@Example.com", email_confirmed_at: "2026-11-25T00:00:00Z" },
    roles,
    ...overrides,
  };
}

function reset({ session, owner, captcha = true, currentAccount = account() } = {}) {
  globalThis.__teacherAccount = currentAccount;
  globalThis.__teacherCaptcha = captcha;
  globalThis.__teacherSessionClient = session ?? fakeClient();
  globalThis.__teacherOwnerClient = owner ?? fakeClient({ results: {
    subjects: { data: [{ id: "math" }], error: null },
    grades: { data: [{ id: "primary-1" }, { id: "primary-2" }], error: null },
    teacher_applications: { data: { id: applicationId, email: "teacher@example.com", status: "accepted", teacher_user_id: null }, error: null },
    teacher_intake_challenges: { data: { id: challengeId }, error: null },
  } });
  globalThis.__teacherSessionCalls = [];
  globalThis.__teacherOwnerCalls = 0;
  globalThis.__teacherCaptchaCalls = [];
  globalThis.__teacherChallenges = [];
}

const savedEnvironment = { ...process.env };
process.env.TEACHER_INTAKE_CAPTCHA_SECRET = "test-only-captcha-secret";
process.env.TEACHER_INTAKE_CAPTCHA_SITE_KEY = "test-only-site-key";
test.after(() => {
  for (const key of Object.keys(process.env)) if (!(key in savedEnvironment)) delete process.env[key];
  Object.assign(process.env, savedEnvironment);
});

test("application submission uses the confirmed session identity and a server-created challenge", async () => {
  const session = fakeClient({ user: account().user, rpcResult: { data: applicationId, error: null } });
  const owner = fakeClient({ results: {
    subjects: { data: [{ id: "math" }], error: null },
    grades: { data: [{ id: "primary-1" }, { id: "primary-2" }], error: null },
    teacher_applications: { data: { id: applicationId }, error: null },
    teacher_intake_challenges: { data: { id: challengeId }, error: null },
  } });
  reset({ session, owner });

  await assert.rejects(() => actions.submitTeacherApplication("", applicationForm()), /redirect:\/teachers\/track\?reference=/);

  assert.deepEqual(globalThis.__teacherSessionCalls, [true]);
  assert.equal(globalThis.__teacherOwnerCalls, 1);
  assert.deepEqual(globalThis.__teacherCaptchaCalls, [["verified-token", "teacher_apply"]]);
  assert.deepEqual(globalThis.__teacherChallenges, [{
    purpose: "submit", actorId: userId, applicationId: null, email: null, ip: "203.0.113.9",
  }]);
  const rpc = session.calls.find(([name]) => name === "rpc");
  assert.equal(rpc[1], "submit_teacher_application");
  assert.equal(rpc[2].p_challenge, challengeId);
  assert.equal(rpc[2].p_subject_id, "math");
  assert.equal("email" in rpc[2].p_profile, false);
  assert.equal("p_actor" in rpc[2], false);
  assert.equal(owner.calls.some(([name, table]) => name === "from" && table === "teacher_applications"), false);
  assert.deepEqual(owner.calls.filter(([name]) => name === "rpc"), [[
    "rpc", "discard_teacher_intake_challenge", { p_challenge: challengeId },
  ]]);
});

test("application submission discards its challenge when the database rejects the request", async () => {
  const session = fakeClient({ user: account().user, rpcResult: { data: null, error: { message: "teacher_intake_invalid" } } });
  const owner = fakeClient({ results: { teacher_intake_challenges: { data: { id: challengeId }, error: null } } });
  reset({ session, owner });

  assert.match(await actions.submitTeacherApplication("", applicationForm()), /تعذّر إرسال الطلب/);
  assert.deepEqual(owner.calls.filter(([name]) => name === "rpc"), [[
    "rpc", "discard_teacher_intake_challenge", { p_challenge: challengeId },
  ]]);
});

test("application submission discards its challenge when insertion fails or is ambiguous", async () => {
  for (const insertThrows of [false, true]) {
    const session = fakeClient({ user: account().user, rpcResult: { data: applicationId, error: null } });
    const owner = fakeClient({
      insertThrows,
      results: { teacher_intake_challenges: { data: null, error: { code: "08006", message: "transport failed" } } },
    });
    reset({ session, owner });

    assert.equal(await actions.submitTeacherApplication("", applicationForm()), "تقديم المدرسين غير متاح حاليًا.");
    assert.equal(session.calls.filter(([name]) => name === "rpc").length, 0);
    assert.deepEqual(owner.calls.filter(([name]) => name === "rpc"), [[
      "rpc", "discard_teacher_intake_challenge", { p_challenge: challengeId },
    ]]);
  }
});

test("application submission rejects inactive roles and unconfirmed Auth email before CAPTCHA", async () => {
  for (const currentAccount of [null, account(["teacher"]), account(["student"], {
    user: { id: userId, email: "student@example.com", email_confirmed_at: null },
  })]) {
    reset({ currentAccount });
    const result = await actions.submitTeacherApplication("", applicationForm());
    assert.match(result, /حساب طالب أو ولي أمر/);
    assert.equal(globalThis.__teacherCaptchaCalls.length, 0);
    assert.equal(globalThis.__teacherOwnerCalls, 0);
  }
});

test("application submission fails closed when CAPTCHA is not verified", async () => {
  reset({ captcha: false });
  const result = await actions.submitTeacherApplication("", applicationForm({ captchaToken: "true" }));
  assert.match(result, /التحقق الأمني/);
  assert.equal(globalThis.__teacherOwnerCalls, 0);
  assert.equal(globalThis.__teacherSessionClient.calls.some(([name]) => name === "rpc"), false);
});

test("tracking creates a purpose-bound email challenge and calls only the generic RPC", async () => {
  const session = fakeClient({ user: account().user, rpcResult: { data: "accepted", error: null } });
  const owner = fakeClient({ results: { teacher_intake_challenges: { data: { id: challengeId }, error: null } } });
  reset({ session, owner });

  const result = await actions.trackTeacherApplication("", form({
    reference: applicationId,
    email: " Student@Example.com ",
    captchaToken: "tracking-token",
  }));

  assert.equal(result, "accepted");
  assert.deepEqual(globalThis.__teacherSessionCalls, [true]);
  assert.deepEqual(globalThis.__teacherCaptchaCalls, [["tracking-token", "teacher_track"]]);
  assert.deepEqual(globalThis.__teacherChallenges, [{
    purpose: "track", actorId: userId, applicationId, email: "student@example.com", ip: "203.0.113.9",
  }]);
  assert.deepEqual(session.calls.filter(([name]) => name === "rpc"), [[
    "rpc", "track_teacher_application", { p_challenge: challengeId },
  ]]);
  assert.equal(session.calls.some(([name, table]) => name === "from" && table === "teacher_applications"), false);
  assert.equal(owner.calls.some(([name, table]) => name === "from" && table !== "teacher_intake_challenges"), false);
  assert.deepEqual(owner.calls.filter(([name]) => name === "rpc"), [[
    "rpc", "discard_teacher_intake_challenge", { p_challenge: challengeId },
  ]]);
});

test("tracking insertion failures and RPC authorization failures return the same generic result", async () => {
  for (const scenario of [
    { inserted: { data: null, error: { code: "23503", message: "missing reference" } }, rpcCalls: 0 },
    { inserted: { data: { id: challengeId }, error: null }, rpcCalls: 1, rpcResult: { data: null, error: { message: "teacher_tracking_forbidden" } } },
    { inserted: { data: { id: challengeId }, error: null }, rpcCalls: 1, rpcResult: { data: null, error: null } },
  ]) {
    const session = fakeClient({ user: null, rpcResult: scenario.rpcResult ?? { data: "pending", error: null } });
    const owner = fakeClient({ results: { teacher_intake_challenges: scenario.inserted } });
    reset({ session, owner, currentAccount: null });
    const result = await actions.trackTeacherApplication("", form({
      reference: applicationId, email: "legacy@example.com", captchaToken: "tracking-token",
    }));
    assert.match(result, /الطلب غير موجود أو رقم المتابعة/);
    assert.equal(session.calls.filter(([name]) => name === "rpc").length, scenario.rpcCalls);
    const ownerRpcs = owner.calls.filter(([name]) => name === "rpc");
    if (scenario.rpcCalls === 0) {
      assert.equal(ownerRpcs[0]?.[1], "consume_teacher_tracking_admission");
      assert.equal(ownerRpcs[0]?.[2].p_actor_id, null);
      assert.match(ownerRpcs[0]?.[2].p_ip_hash ?? "", /^[a-f0-9]{64}$/);
    } else {
      assert.deepEqual(ownerRpcs, [[
        "rpc", "discard_teacher_intake_challenge", { p_challenge: challengeId },
      ]]);
    }
  }
});

test("tracking consumes admission and discards its challenge when insertion is ambiguous", async () => {
  for (const insertThrows of [false, true]) {
    const session = fakeClient({ user: null, rpcResult: { data: "pending", error: null } });
    const owner = fakeClient({
      insertThrows,
      results: { teacher_intake_challenges: { data: null, error: { code: "08006", message: "transport failed" } } },
    });
    reset({ session, owner, currentAccount: null });

    assert.equal(await actions.trackTeacherApplication("", form({
      reference: applicationId, email: "legacy@example.com", captchaToken: "tracking-token",
    })), "الطلب غير موجود أو رقم المتابعة غير صحيح.");
    assert.equal(session.calls.filter(([name]) => name === "rpc").length, 0);
    const ownerRpcs = owner.calls.filter(([name]) => name === "rpc");
    assert.equal(ownerRpcs[0]?.[1], "consume_teacher_tracking_admission");
    assert.equal(ownerRpcs[0]?.[2].p_actor_id, null);
    assert.match(ownerRpcs[0]?.[2].p_ip_hash ?? "", /^[a-f0-9]{64}$/);
    assert.deepEqual(ownerRpcs[1], ["rpc", "discard_teacher_intake_challenge", { p_challenge: challengeId }]);
  }
});

test("tracking maps replay expiry and wrong-actor RPC failures to one generic error", async () => {
  for (const message of ["teacher_tracking_challenge_invalid", "teacher_tracking_forbidden", "teacher_tracking_rate_limited"]) {
    const session = fakeClient({ rpcResult: { data: null, error: { message } } });
    const owner = fakeClient({ results: { teacher_intake_challenges: { data: { id: challengeId }, error: null } } });
    reset({ session, owner, currentAccount: null });
    const result = await actions.trackTeacherApplication("", form({
      reference: applicationId, email: "legacy@example.com", captchaToken: "tracking-token",
    }));
    assert.match(result, /الطلب غير موجود أو رقم المتابعة/);
    assert.equal(result.includes(message), false);
  }
});

test("admin acceptance is persisted through the JWT RPC before redirect", async () => {
  const session = fakeClient({ rpcResult: { data: true, error: null } });
  reset({ session, currentAccount: account(["admin"], { user: { ...account().user, id: adminId } }) });

  await assert.rejects(
    () => actions.reviewTeacherApplication(applicationId, form({ status: "accepted" })),
    new RegExp(`redirect:/admin/teachers\\?application=${applicationId}`),
  );

  assert.deepEqual(globalThis.__teacherSessionCalls, [true]);
  assert.equal(globalThis.__teacherOwnerCalls, 0);
  assert.deepEqual(session.calls.filter(([name]) => name === "rpc"), [[
    "rpc", "review_teacher_application_as_admin", { p_application: applicationId, p_status: "accepted" },
  ]]);
});

test("admin rejection is persisted through the JWT RPC before redirect", async () => {
  const session = fakeClient({ rpcResult: { data: true, error: null } });
  reset({ session, currentAccount: account(["owner"]) });

  await assert.rejects(
    () => actions.reviewTeacherApplication(applicationId, form({ status: "rejected" })),
    /redirect:\/admin\/teacher-applications$/,
  );

  assert.deepEqual(session.calls.filter(([name]) => name === "rpc"), [[
    "rpc", "review_teacher_application_as_admin", { p_application: applicationId, p_status: "rejected" },
  ]]);
  assert.equal(globalThis.__teacherOwnerCalls, 0);
});

test("onboarding delegates active-role verification to the canonical RPC and uses the admin JWT", async () => {
  const session = fakeClient({
    results: {
      teacher_applications: { data: { email: "teacher@example.com", status: "accepted", teacher_user_id: null }, error: null },
      subjects: { data: [{ id: "math" }], error: null },
      grades: { data: [{ id: "primary-1" }], error: null },
      profiles: { data: { status: "active" }, error: null },
      account_roles: { data: [{ role_code: "student" }], error: null },
    },
    rpcResult: { data: null, error: null },
  });
  const owner = fakeClient({ results: {
    teacher_applications: { data: { email: "teacher@example.com", status: "accepted", teacher_user_id: null }, error: null },
    subjects: { data: [{ id: "math" }], error: null },
    grades: { data: [{ id: "primary-1" }], error: null },
  } });
  reset({ session, owner, currentAccount: account(["admin"], { user: { ...account().user, id: adminId } }) });

  await assert.rejects(
    () => onboardTeacher(applicationId, "", applicationForm({ email: "teacher@example.com", grades: ["primary-1"] })),
    /redirect:\/admin\/teachers\?message=added&created=/,
  );

  assert.deepEqual(globalThis.__teacherSessionCalls, [true]);
  const rpc = session.calls.find(([name]) => name === "rpc");
  assert.equal(rpc[1], "complete_teacher_onboarding");
  assert.equal(rpc[2].p_user, userId);
  assert.equal(rpc[2].p_application, applicationId);
  assert.equal("p_actor" in rpc[2], false);
  assert.equal(session.calls.some(([name, table]) => name === "from" && table === "teacher_applications"), false);
  assert.equal(session.calls.some(([name, table]) => name === "from" && table === "profiles"), false);
  assert.equal(session.calls.some(([name, table]) => name === "from" && table === "account_roles"), false);
  assert.deepEqual(owner.calls.filter(([name]) => name === "auth.admin.createUser" || name === "auth.admin.deleteUser"), [[
    "auth.admin.createUser", {
      email: "teacher@example.com", password: "a-secure-password", email_confirm: true,
      user_metadata: { display_name: "مدرس تجريبي" }, app_metadata: { liveschool_role: "student" },
    },
  ]]);
});

test("onboarding compensates when the canonical RPC rejects the target role", async () => {
  const session = fakeClient({
    results: {
      subjects: { data: [{ id: "math" }], error: null },
      grades: { data: [{ id: "primary-1" }, { id: "primary-2" }], error: null },
      teacher_profiles: { data: null, error: null },
    },
    rpcResult: { data: null, error: { message: "teacher_target_invalid", code: "23514" }, status: 400 },
  });
  const owner = fakeClient({ results: {
    subjects: { data: [{ id: "math" }], error: null },
    grades: { data: [{ id: "primary-1" }, { id: "primary-2" }], error: null },
  } });
  reset({ session, owner, currentAccount: account(["admin"]) });

  const result = await onboardTeacher(null, "", applicationForm({ email: "teacher@example.com", password: "a-secure-password" }));
  assert.match(result, /تعذّر حفظ ملف المدرس/);
  assert.equal(session.calls.some(([name]) => name === "rpc"), true);
  assert.equal(owner.calls.some(([name]) => name === "auth.admin.deleteUser"), true);
});

test("onboarding preserves ambiguous-failure and successful-profile compensation behavior", async () => {
  const application = applicationForm({ email: "teacher@example.com", password: "a-secure-password" });
  for (const scenario of [
    { profile: { data: { user_id: userId }, error: null }, rpc: { data: null, error: { message: "failed" } }, status: 400, deleted: false, redirect: true },
    { profile: { data: null, error: null }, rpc: { data: null, error: { message: "failed" } }, status: 400, deleted: true, redirect: false },
    { profile: { data: null, error: null }, rpc: { data: null, error: { message: "failed" } }, status: 503, deleted: false, redirect: false },
  ]) {
    const session = fakeClient({
      results: {
        subjects: { data: [{ id: "math" }], error: null },
        grades: { data: [{ id: "primary-1" }, { id: "primary-2" }], error: null },
        profiles: { data: { status: "active" }, error: null },
        account_roles: { data: [{ role_code: "parent" }], error: null },
        teacher_profiles: scenario.profile,
      },
      rpcResult: { ...scenario.rpc, status: scenario.status },
    });
    const owner = fakeClient({
      results: {
        subjects: { data: [{ id: "math" }], error: null },
        grades: { data: [{ id: "primary-1" }, { id: "primary-2" }], error: null },
        teacher_profiles: scenario.profile,
      },
      rpcResult: { ...scenario.rpc, status: scenario.status },
    });
    reset({ session, owner, currentAccount: account(["admin"]) });
    const pending = onboardTeacher(null, "", application);
    if (scenario.redirect) await assert.rejects(pending, /redirect:\/admin\/teachers\?message=added&created=/);
    else assert.match(await pending, scenario.deleted ? /حاول مرة تانية/ : /راجع دليل الحسابات/);
    assert.equal(owner.calls.some(([name]) => name === "auth.admin.deleteUser"), scenario.deleted);
    assert.equal(owner.calls.some(([name, table]) => name === "from" && table === "teacher_profiles"), false);
  }
});

test("application email hashes use the canonical normalized lowercase value", async () => {
  const session = fakeClient({ rpcResult: { data: "pending", error: null } });
  const owner = fakeClient({ results: { teacher_intake_challenges: { data: { id: challengeId }, error: null } } });
  reset({ session, owner, currentAccount: null });
  await actions.trackTeacherApplication("", form({ reference: applicationId, email: " Legacy@Example.com ", captchaToken: "token" }));
  const inserted = owner.calls.find(([name, table]) => name === "insert" && table === "teacher_intake_challenges")[2];
  assert.equal(inserted.email_hash, createHash("sha256").update("legacy@example.com").digest("hex"));
});
