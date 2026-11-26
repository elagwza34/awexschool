import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { registerHooks } from "node:module";
import test, { after } from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "./playwright.config") return nextResolve("./playwright.config.ts", context);
    return nextResolve(specifier, context);
  },
});

const { default: previewConfig } = await import("../../playwright.preview.config.ts");
const { default: liveConfig } = await import("../../playwright.live.config.ts");
const { default: baseConfig } = await import("../../playwright.config.ts");

const packageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
const temporaryDirectories = [
  baseConfig.webServer.env.SITE_LOCK_STORE_DIR,
  previewConfig.webServer.env.SITE_LOCK_STORE_DIR,
  liveConfig.webServer.env.SITE_LOCK_STORE_DIR,
];

after(() => {
  for (const directory of temporaryDirectories) rmSync(directory, { recursive: true, force: true });
});

test("preview QA builds inside the scrubbed Playwright server environment", () => {
  assert.equal(
    packageJson.scripts["test:qa:preview"],
    "npm run lint && npm run typecheck && npm test && playwright test --config=playwright.preview.config.ts",
  );
  assert.equal(previewConfig.webServer.command, "npm run build:test && npm run start -- --port 3100");
  assert.equal(previewConfig.webServer.timeout, 180_000);
  assert.equal(typeof packageJson.scripts["build:test"], "string");
  assert.equal(previewConfig.webServer.env.LIVESCHOOL_ENV, "test");
  assert.equal(previewConfig.webServer.env.NEXT_PUBLIC_LIVESCHOOL_ENV, "test");
  assert.equal(previewConfig.webServer.env.NEXT_PUBLIC_SUPABASE_URL, "http://127.0.0.1:54321");
});

test("default browser QA does not import Node unit test files", () => {
  assert.deepEqual(baseConfig.testMatch, ["**/*.spec.ts"]);
});

test("both QA server environments scrub every prohibited credential variable", () => {
  const prohibited = [
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_DB_PASSWORD",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DATABASE_URL",
    "POSTGRES_URL",
    "POSTGRES_PASSWORD",
    "POSTGRES_USER",
    "PGPASSWORD",
  ];
  for (const config of [previewConfig, liveConfig]) {
    for (const name of prohibited) assert.equal(config.webServer.env[name], "", name);
  }
});

test("live QA propagates only explicitly allowlisted local credentials", () => {
  assert.equal(liveConfig.webServer.command, "npm run build:test && npm run start -- --port 3100");
  assert.equal(
    liveConfig.webServer.env.NEXT_PUBLIC_LIVESCHOOL_TEST_ALLOWED_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_LIVESCHOOL_TEST_ALLOWED_PUBLISHABLE_KEY ?? "",
  );
  assert.equal(
    liveConfig.webServer.env.LIVESCHOOL_TEST_ALLOWED_SECRET_KEY,
    process.env.LIVESCHOOL_TEST_ALLOWED_SECRET_KEY ?? "",
  );
});

test("the test build refuses a conflicting public environment marker before Next.js starts", () => {
  const result = spawnSync(process.execPath, ["scripts/build-test.mjs"], {
    cwd: new URL("../../", import.meta.url),
    env: {
      ...process.env,
      NODE_ENV: "test",
      LIVESCHOOL_ENV: "test",
      NEXT_PUBLIC_LIVESCHOOL_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      SUPABASE_SECRET_KEY: "",
    },
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /NEXT_PUBLIC_LIVESCHOOL_ENV/);
  assert.doesNotMatch(result.stdout, /Creating an optimized production build/);
});
