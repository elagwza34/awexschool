import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";

const packageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));

test("the live QA command uses the fail-closed wrapper", () => {
  assert.equal(packageJson.scripts["test:qa:live"], "node scripts/live-test.mjs");
});

test("the live QA wrapper blocks before Playwright when explicit local opt-in is absent", () => {
  const env = { ...process.env };
  for (const name of [
    "LIVESCHOOL_LIVE_TESTS",
    "LIVESCHOOL_ENV",
    "NEXT_PUBLIC_LIVESCHOOL_ENV",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_LIVESCHOOL_TEST_ALLOWED_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "LIVESCHOOL_TEST_ALLOWED_SECRET_KEY",
    "LIVESCHOOL_TEST_ALLOW_SERVICE_ROLE",
  ]) delete env[name];
  env.NODE_ENV = "production";
  env.NEXT_PUBLIC_SUPABASE_URL = "https://production.example.supabase.co";
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "remote-publishable-key";
  env.SUPABASE_SECRET_KEY = "remote-secret-key";

  const result = spawnSync(process.execPath, ["scripts/live-test.mjs"], {
    cwd: new URL("../../", import.meta.url),
    env,
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Live QA BLOCKED/);
  assert.doesNotMatch(result.stderr, /remote-(?:publishable|secret)-key/);
});

test("the live QA result rejects skipped, empty, flaky, and failed mandatory runs", async () => {
  const { evaluateLiveRun } = await import("../../scripts/live-test.mjs");
  const stats = { expected: 3, unexpected: 0, skipped: 0, flaky: 0 };
  assert.equal(evaluateLiveRun({ status: 0, stats }), null);
  assert.match(evaluateLiveRun({ status: 0, stats: { ...stats, expected: 0, skipped: 3 } }), /no mandatory live tests executed/i);
  assert.match(evaluateLiveRun({ status: 0, stats: { ...stats, skipped: 1 } }), /skipped/);
  assert.match(evaluateLiveRun({ status: 0, stats: { ...stats, flaky: 1 } }), /flaky/);
  assert.match(evaluateLiveRun({ status: 1, stats }), /exited with status 1/);
  assert.match(evaluateLiveRun({ status: 0, stats: null }), /did not produce/);
});

test("the live QA preflight accepts only complete allowlisted local configuration", async () => {
  const { assertLiveTestEnvironment } = await import("../../scripts/live-test.mjs");
  const local = {
    LIVESCHOOL_LIVE_TESTS: "1",
    LIVESCHOOL_ENV: "test",
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "local-publishable-key",
    NEXT_PUBLIC_LIVESCHOOL_TEST_ALLOWED_PUBLISHABLE_KEY: "local-publishable-key",
    SUPABASE_SECRET_KEY: "local-secret-key",
    LIVESCHOOL_TEST_ALLOWED_SECRET_KEY: "local-secret-key",
    LIVESCHOOL_TEST_ALLOW_SERVICE_ROLE: "1",
  };
  assert.equal(assertLiveTestEnvironment(local).secretKey, "local-secret-key");
  assert.throws(() => assertLiveTestEnvironment({ ...local, NEXT_PUBLIC_SUPABASE_URL: "https://production.example.supabase.co" }), /local Supabase/);
  assert.throws(() => assertLiveTestEnvironment({ ...local, SUPABASE_SECRET_KEY: undefined }), /publishable and secret keys/);
});
