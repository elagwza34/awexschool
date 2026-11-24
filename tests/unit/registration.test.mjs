import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { readRegistration, signupMetadata } from "../../src/features/auth/registration.ts";

function form(values = {}) {
  const result = new FormData();
  for (const [key, value] of Object.entries({
    name: "Test Learner", email: "LEARNER@example.test", password: "local-test-password",
    confirmPassword: "local-test-password", kind: "student", phone: "", ...values,
  })) result.set(key, value);
  return result;
}

for (const kind of ["student", "parent"]) {
  test(`routed ${kind} registration preserves normalized account metadata`, () => {
    const registration = readRegistration(form({ kind, phone: "+20 100 000 0000" }));
    assert.deepEqual(registration, {
      displayName: "Test Learner", email: "learner@example.test", password: "local-test-password",
      kind, phone: "+20 100 000 0000",
    });
    assert.deepEqual(signupMetadata(registration), {
      display_name: "Test Learner", account_kind: kind, contact_phone: "+20 100 000 0000",
    });
  });
}

test("registration rejects unsupported roles, invalid fields and password mismatch", () => {
  for (const values of [
    { kind: "teacher" }, { kind: "admin" }, { kind: "" }, { name: "x" },
    { email: "invalid" }, { password: "short" }, { confirmPassword: "different" }, { phone: "abc" },
  ]) assert.equal(readRegistration(form(values)), null);
});

test("optional phone is omitted from signup metadata", () => {
  assert.deepEqual(signupMetadata(readRegistration(form({ kind: "parent" }))), {
    display_name: "Test Learner", account_kind: "parent",
  });
});

test("the final account-profile trigger maps parent metadata and defaults to student", () => {
  const directory = new URL("../../supabase/migrations/", import.meta.url);
  const initial = readFileSync(new URL("20261119200657_account_access_and_demo_settings.sql", directory), "utf8");
  const final = readFileSync(new URL("20261119201120_assign_created_account_role.sql", directory), "utf8");
  assert.match(initial, /create trigger liveschool_create_account_profile[\s\S]*?after insert on auth\.users/);
  assert.match(final, /create or replace function liveschool_internal\.create_account_profile/);
  assert.match(final, /account_kind' = 'parent' then 'parent' else 'student'/);
});
