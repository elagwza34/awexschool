import assert from "node:assert/strict";
import test from "node:test";
import {
  readSupabaseEnvironment,
  UnsafeTestEnvironmentError,
} from "../../src/lib/environment.ts";

const localUrl = "http://127.0.0.1:54321";
const localKey = "local-test-publishable-key";

function environment(overrides = {}) {
  return {
    NODE_ENV: "test",
    LIVESCHOOL_ENV: "test",
    NEXT_PUBLIC_SUPABASE_URL: localUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: localKey,
    NEXT_PUBLIC_LIVESCHOOL_TEST_ALLOWED_PUBLISHABLE_KEY: localKey,
    ...overrides,
  };
}

test("accepts an explicitly marked test environment and the approved local Supabase endpoint", () => {
  assert.deepEqual(readSupabaseEnvironment(environment()), {
    url: localUrl,
    key: localKey,
    secretKey: undefined,
  });
  assert.deepEqual(readSupabaseEnvironment(environment({ NEXT_PUBLIC_SUPABASE_URL: `${localUrl}/` })), {
    url: `${localUrl}/`,
    key: localKey,
    secretKey: undefined,
  });
});

test("accepts the public test marker needed by browser bundles", () => {
  assert.equal(
    readSupabaseEnvironment(environment({ LIVESCHOOL_ENV: undefined, NEXT_PUBLIC_LIVESCHOOL_ENV: "test" })).url,
    localUrl,
  );
});

test("requires an explicit marker when Node is running tests", () => {
  assert.throws(
    () => readSupabaseEnvironment(environment({ LIVESCHOOL_ENV: undefined, NEXT_PUBLIC_LIVESCHOOL_ENV: undefined })),
    (error) => error instanceof UnsafeTestEnvironmentError && /LIVESCHOOL_ENV/.test(error.message),
  );
});

test("rejects a non-test marker during test execution", () => {
  assert.throws(
    () => readSupabaseEnvironment(environment({ LIVESCHOOL_ENV: "development" })),
    (error) => error instanceof UnsafeTestEnvironmentError && /LIVESCHOOL_ENV/.test(error.message),
  );
});

test("rejects a conflicting public environment marker", () => {
  assert.throws(
    () => readSupabaseEnvironment(environment({ NEXT_PUBLIC_LIVESCHOOL_ENV: "production" })),
    (error) => error instanceof UnsafeTestEnvironmentError && /NEXT_PUBLIC_LIVESCHOOL_ENV/.test(error.message),
  );
});

test("rejects remote Supabase endpoints before returning client configuration", () => {
  assert.throws(
    () => readSupabaseEnvironment(environment({ NEXT_PUBLIC_SUPABASE_URL: "https://production.example.supabase.co" })),
    (error) => error instanceof UnsafeTestEnvironmentError && /local Supabase/.test(error.message),
  );
});

test("rejects local-looking endpoints with a different protocol, host, port, path, query, or credentials", () => {
  for (const url of [
    "http://localhost:54321",
    "http://127.0.0.1:54322",
    "https://127.0.0.1:54321",
    "http://127.0.0.1:54321/admin",
    "http://127.0.0.1:54321?token=value",
    "http://user:password@127.0.0.1:54321",
  ]) {
    assert.throws(
      () => readSupabaseEnvironment(environment({ NEXT_PUBLIC_SUPABASE_URL: url })),
      (error) => error instanceof UnsafeTestEnvironmentError && /local Supabase/.test(error.message),
      url,
    );
  }
});

test("rejects management and database credentials in test mode without exposing their values", () => {
  for (const name of [
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_DB_PASSWORD",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DATABASE_URL",
    "POSTGRES_URL",
    "POSTGRES_PASSWORD",
    "POSTGRES_USER",
    "PGPASSWORD",
  ]) {
    const value = `sensitive-${name.toLowerCase()}-value`;
    assert.throws(
      () => readSupabaseEnvironment(environment({ [name]: value })),
      (error) => error instanceof UnsafeTestEnvironmentError && error.message.includes(name) && !error.message.includes(value),
      name,
    );
  }
});

test("rejects unapproved production-style Supabase API keys in test mode", () => {
  const publishable = "sb_publishable_do-not-use-in-tests";
  assert.throws(
    () => readSupabaseEnvironment(environment({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishable })),
    (error) => error instanceof UnsafeTestEnvironmentError && !error.message.includes(publishable),
  );

  const secret = "sb_secret_do-not-use-in-tests";
  assert.throws(
    () => readSupabaseEnvironment(environment({
      SUPABASE_SECRET_KEY: secret,
      LIVESCHOOL_TEST_ALLOW_SERVICE_ROLE: "1",
    })),
    (error) => error instanceof UnsafeTestEnvironmentError && !error.message.includes(secret),
  );
});

test("rejects legacy production JWTs unless explicitly allowlisted as local keys", () => {
  const legacyPublishable = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiIsInJlZiI6InJlbW90ZS1wcm9qZWN0In0.signature";
  const legacySecret = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwicmVmIjoicmVtb3RlLXByb2plY3QifQ.signature";
  assert.throws(
    () => readSupabaseEnvironment(environment({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: legacyPublishable })),
    (error) => error instanceof UnsafeTestEnvironmentError && !error.message.includes(legacyPublishable),
  );
  assert.throws(
    () => readSupabaseEnvironment(environment({
      SUPABASE_SECRET_KEY: legacySecret,
      LIVESCHOOL_TEST_ALLOW_SERVICE_ROLE: "1",
    })),
    (error) => error instanceof UnsafeTestEnvironmentError && !error.message.includes(legacySecret),
  );
});

test("accepts modern and legacy local keys only through the explicit local allowlist", () => {
  for (const key of [
    "sb_publishable_local-approved-key",
    "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIn0.signature",
  ]) {
    assert.equal(readSupabaseEnvironment(environment({
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
      NEXT_PUBLIC_LIVESCHOOL_TEST_ALLOWED_PUBLISHABLE_KEY: key,
    })).key, key);
  }
  const secret = "sb_secret_local-approved-key";
  assert.equal(readSupabaseEnvironment(environment({
    SUPABASE_SECRET_KEY: secret,
    LIVESCHOOL_TEST_ALLOWED_SECRET_KEY: secret,
    LIVESCHOOL_TEST_ALLOW_SERVICE_ROLE: "1",
  })).secretKey, secret);
});

test("requires deliberate opt-in before accepting a local service-role credential", () => {
  const secret = "local-service-role-key";
  assert.throws(
    () => readSupabaseEnvironment(environment({
      SUPABASE_SECRET_KEY: secret,
      LIVESCHOOL_TEST_ALLOWED_SECRET_KEY: secret,
    })),
    (error) => error instanceof UnsafeTestEnvironmentError && /LIVESCHOOL_TEST_ALLOW_SERVICE_ROLE/.test(error.message),
  );
  assert.equal(
    readSupabaseEnvironment(environment({
      SUPABASE_SECRET_KEY: secret,
      LIVESCHOOL_TEST_ALLOWED_SECRET_KEY: secret,
      LIVESCHOOL_TEST_ALLOW_SERVICE_ROLE: "1",
    })).secretKey,
    secret,
  );
});

test("returns no client configuration for an unconfigured but explicitly safe test environment", () => {
  assert.equal(readSupabaseEnvironment(environment({
    NEXT_PUBLIC_SUPABASE_URL: undefined,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
  })), null);
});

test("preserves legitimate non-test remote configuration and credentials", () => {
  const config = {
    NODE_ENV: "production",
    NEXT_PUBLIC_SUPABASE_URL: "https://production.example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "production-publishable-key",
    SUPABASE_SECRET_KEY: "production-secret-key",
    SUPABASE_ACCESS_TOKEN: "management-token",
    DATABASE_URL: "postgresql://database.example/app",
  };
  assert.deepEqual(readSupabaseEnvironment(config), {
    url: config.NEXT_PUBLIC_SUPABASE_URL,
    key: config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    secretKey: config.SUPABASE_SECRET_KEY,
  });
});
