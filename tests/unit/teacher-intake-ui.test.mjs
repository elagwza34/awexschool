import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("apply page gates active student or parent sessions and never renders an email input", () => {
  const page = read("src/app/(public)/teachers/apply/page.tsx");
  assert.match(page, /sessionClient\(true\)/);
  assert.match(page, /readTeacherSessionAccount/);
  assert.match(page, /role === "student" \|\| role === "parent"/);
  assert.match(page, /readTeacherCaptchaPublicConfig/);
  assert.doesNotMatch(page, /\["email"|name=\{?"?email|name="email"/);
});

test("tracking page performs no application SELECT and delegates submission to the CAPTCHA form", () => {
  const page = read("src/app/(public)/teachers/track/page.tsx");
  assert.match(page, /LiveTrackingForm/);
  assert.match(page, /readTeacherCaptchaPublicConfig/);
  assert.doesNotMatch(page, /ownerClient|from\("teacher_applications"\)|\.select\("status"\)/);
});

test("both live forms submit a CAPTCHA token rather than a client boolean", () => {
  const apply = read("src/features/teachers/live-application-form.tsx");
  const trackPath = "src/features/teachers/live-tracking-form.tsx";
  assert.equal(existsSync(new URL(`../../${trackPath}`, import.meta.url)), true);
  const track = read(trackPath);
  const captcha = read("src/features/teachers/teacher-captcha.tsx");
  for (const source of [apply, track]) {
    assert.match(source, /TeacherCaptcha/);
    assert.doesNotMatch(source, /name="captcha"|captchaVerified|verified/);
  }
  assert.match(captcha, /name="captchaToken"/);
  assert.match(captcha, /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/);
  assert.match(captcha, /"expired-callback": clearToken/);
  assert.match(captcha, /wasPending\.current && !pending/);
  assert.match(captcha, /turnstile\.reset\(widget\.current\)/);
  assert.match(track, /trackTeacherApplication/);
});
