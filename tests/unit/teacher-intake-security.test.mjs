import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";

globalThis.__teacherHeaders = new Headers();

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
    if (specifier === "next/headers") {
      return { url: "data:text/javascript,export async function headers() { return globalThis.__teacherHeaders; }", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const security = await import("../../src/features/teachers/teacher-intake-security.ts");
const originalEnvironment = { ...process.env };
const originalFetch = globalThis.fetch;

function environment(overrides = {}) {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("TEACHER_INTAKE_") || key.startsWith("NEXT_PUBLIC_TEACHER_INTAKE_") || key === "LIVESCHOOL_TRUSTED_PROXY_SECRET") {
      delete process.env[key];
    }
  }
  const values = {
    TEACHER_INTAKE_CAPTCHA_SECRET: "server-secret",
    NEXT_PUBLIC_TEACHER_INTAKE_CAPTCHA_SITE_KEY: "public-site-key",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.__teacherHeaders = new Headers();
  for (const key of Object.keys(process.env)) if (!(key in originalEnvironment)) delete process.env[key];
  Object.assign(process.env, originalEnvironment);
});

test("CAPTCHA configuration and public rendering fail closed when the server secret is absent", () => {
  environment({ TEACHER_INTAKE_CAPTCHA_SECRET: undefined });
  assert.equal(security.readTeacherCaptchaConfig(), null);
  assert.equal(security.readTeacherCaptchaPublicConfig(), null);
  assert.equal(security.readTeacherCaptchaConfig({ ...process.env, TEACHER_INTAKE_CAPTCHA_VERIFY_URL: "http://insecure.example" }), null);
});

test("CAPTCHA verification denies missing boolean and malformed tokens without fetching", async () => {
  environment();
  let fetches = 0;
  globalThis.fetch = async () => { fetches += 1; throw new Error("must not fetch"); };
  for (const token of [undefined, null, true, false, "true", "false", "", "short", "x".repeat(4097)]) {
    assert.equal(await security.verifyTeacherCaptcha(token, "teacher_apply"), false);
  }
  assert.equal(fetches, 0);
});

test("CAPTCHA verification posts the token to the trusted provider with a trusted proxy IP", async () => {
  environment({
    TEACHER_INTAKE_CAPTCHA_HOSTNAMES: "liveschool.test,www.liveschool.test",
    LIVESCHOOL_TRUSTED_PROXY_SECRET: "proxy-secret",
    TEACHER_INTAKE_TRUSTED_PROXY_IPS: "10.0.0.1",
  });
  globalThis.__teacherHeaders = new Headers({
    "x-liveschool-proxy-secret": "proxy-secret",
    "x-forwarded-for": "203.0.113.9, 10.0.0.1",
  });
  const requests = [];
  globalThis.fetch = async (input, init) => {
    requests.push([input, init]);
    return Response.json({ success: true, hostname: "liveschool.test", action: "teacher_apply" });
  };

  assert.equal(await security.verifyTeacherCaptcha("valid-captcha-token-123456", "teacher_apply"), true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0][0], "https://challenges.cloudflare.com/turnstile/v0/siteverify");
  assert.equal(requests[0][1].cache, "no-store");
  const body = new URLSearchParams(requests[0][1].body);
  assert.equal(body.get("secret"), "server-secret");
  assert.equal(body.get("response"), "valid-captcha-token-123456");
  assert.equal(body.get("remoteip"), "203.0.113.9");
});

test("CAPTCHA verification rejects provider failures hostname action and network mismatches", async () => {
  environment({ TEACHER_INTAKE_CAPTCHA_HOSTNAMES: "liveschool.test" });
  for (const payload of [
    { success: false },
    { success: true, hostname: "attacker.test", action: "teacher_apply" },
    { success: true, hostname: "liveschool.test", action: "teacher_track" },
    { success: true, hostname: "liveschool.test" },
  ]) {
    globalThis.fetch = async () => Response.json(payload);
    assert.equal(await security.verifyTeacherCaptcha("valid-captcha-token-123456", "teacher_apply"), false);
  }
  globalThis.fetch = async () => { throw new TypeError("network failed"); };
  assert.equal(await security.verifyTeacherCaptcha("valid-captcha-token-123456", "teacher_apply"), false);
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  assert.equal(await security.verifyTeacherCaptcha("valid-captcha-token-123456", "teacher_apply"), false);
});

test("forwarded client IPs are ignored unless the request comes through the configured trusted proxy", async () => {
  environment({ LIVESCHOOL_TRUSTED_PROXY_SECRET: "proxy-secret", TEACHER_INTAKE_TRUSTED_PROXY_IPS: "10.0.0.1,2001:db8::1" });
  globalThis.__teacherHeaders = new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" });
  assert.equal(await security.readTrustedRequestIp(), null);

  globalThis.__teacherHeaders = new Headers({ "x-liveschool-proxy-secret": "wrong", "x-forwarded-for": "203.0.113.9, 10.0.0.1" });
  assert.equal(await security.readTrustedRequestIp(), null);

  globalThis.__teacherHeaders = new Headers({ "x-liveschool-proxy-secret": "proxy-secret", "x-forwarded-for": "203.0.113.9, 10.0.0.1" });
  assert.equal(await security.readTrustedRequestIp(), "203.0.113.9");

  globalThis.__teacherHeaders = new Headers({ "x-liveschool-proxy-secret": "proxy-secret", "x-forwarded-for": "203.0.113.9, 198.51.100.8" });
  assert.equal(await security.readTrustedRequestIp(), null);

  globalThis.__teacherHeaders = new Headers({ "x-liveschool-proxy-secret": "proxy-secret", "x-forwarded-for": "2001:db8::9, 2001:db8::1" });
  assert.equal(await security.readTrustedRequestIp(), "2001:db8::9");
});

test("server-created challenges are short lived and bind purpose actor application and normalized email", () => {
  environment();
  const now = new Date("2026-11-25T12:00:00.000Z");
  const submit = security.buildTeacherIntakeChallenge({
    purpose: "submit", actorId: "22222222-2222-4222-8222-222222222222", ip: "203.0.113.9", now,
  });
  assert.match(submit.id, /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i);
  assert.equal(submit.purpose, "submit");
  assert.equal(submit.actor_id, "22222222-2222-4222-8222-222222222222");
  assert.equal(submit.application_id, null);
  assert.equal(submit.email_hash, null);
  assert.equal("consumed_at" in submit, false);
  assert.equal(submit.expires_at.toISOString(), "2026-11-25T12:10:00.000Z");
  assert.match(submit.ip_hash, /^[a-f0-9]{64}$/);

  const track = security.buildTeacherIntakeChallenge({
    purpose: "track", actorId: null, applicationId: "11111111-1111-4111-8111-111111111111",
    email: " Legacy@Example.com ", ip: null, now,
  });
  assert.equal(track.purpose, "track");
  assert.equal(track.actor_id, null);
  assert.equal(track.application_id, "11111111-1111-4111-8111-111111111111");
  assert.equal(track.email_hash, createHash("sha256").update("legacy@example.com").digest("hex"));
  assert.equal("consumed_at" in track, false);
});

test("challenge creation cannot proceed with missing CAPTCHA secret or invalid purpose bindings", () => {
  environment({ TEACHER_INTAKE_CAPTCHA_SECRET: undefined });
  assert.throws(() => security.buildTeacherIntakeChallenge({ purpose: "submit", actorId: "actor", ip: null }), /captcha/i);
  environment();
  assert.throws(() => security.buildTeacherIntakeChallenge({ purpose: "track", applicationId: null, email: "a@example.com", ip: null }), /challenge/i);
  assert.throws(() => security.buildTeacherIntakeChallenge({ purpose: "submit", actorId: null, ip: null }), /challenge/i);
});

test("the migration locks intake tables in tracking runtime order", () => {
  const migration = readFileSync(new URL("../../supabase/migrations/20261126170000_phase02_authorization_isolation.sql", import.meta.url), "utf8");
  const lockList = migration.match(/lock table([\s\S]*?)in share row exclusive mode/i)?.[1] ?? "";
  const challenges = lockList.indexOf("public.teacher_intake_challenges");
  const counters = lockList.indexOf("public.teacher_intake_rate_limits");
  const applications = lockList.indexOf("public.teacher_applications");
  assert.ok(challenges >= 0 && counters > challenges && applications > counters, "expected challenges, rate limits, then applications");
});

test("the migration retains challenge referential integrity and adds service-role-only intake helpers", () => {
  const migration = readFileSync(new URL("../../supabase/migrations/20261126170000_phase02_authorization_isolation.sql", import.meta.url), "utf8");
  assert.doesNotMatch(migration, /drop constraint teacher_intake_challenges_application_id_fkey/i);
  assert.match(migration, /create or replace function public\.consume_teacher_tracking_admission/i);
  assert.match(migration, /create or replace function public\.discard_teacher_intake_challenge/i);
  assert.match(migration, /revoke all on table public\.course_enrollment_review_audit from public, anon, authenticated, service_role/i);
});

test("the browser policy permits only the configured Turnstile script and challenge frame", () => {
  const proxy = readFileSync(new URL("../../src/proxy.ts", import.meta.url), "utf8");
  assert.match(proxy, /script-src[^;\n]*https:\/\/challenges\.cloudflare\.com/);
  assert.match(proxy, /frame-src[^;\n]*https:\/\/challenges\.cloudflare\.com/);
});
