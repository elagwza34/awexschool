import { defineConfig } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["**/*.spec.ts"],
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run build:test && npm run start -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      LIVESCHOOL_ENV: "test",
      NEXT_PUBLIC_LIVESCHOOL_ENV: "test",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      NEXT_PUBLIC_LIVESCHOOL_TEST_ALLOWED_PUBLISHABLE_KEY: "",
      SUPABASE_SECRET_KEY: "",
      LIVESCHOOL_TEST_ALLOWED_SECRET_KEY: "",
      SUPABASE_ACCESS_TOKEN: "",
      SUPABASE_DB_PASSWORD: "",
      TEACHER_INTAKE_CAPTCHA_SECRET: "",
      NEXT_PUBLIC_TEACHER_INTAKE_CAPTCHA_SITE_KEY: "",
      TEACHER_INTAKE_CAPTCHA_VERIFY_URL: "",
      TEACHER_INTAKE_CAPTCHA_HOSTNAMES: "",
      LIVESCHOOL_TRUSTED_PROXY_SECRET: "local-playwright-proxy-secret",
      LIVESCHOOL_TRUSTED_PROXY_IPS: "10.0.0.1",
      TEACHER_INTAKE_TRUSTED_PROXY_IPS: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      DATABASE_URL: "",
      POSTGRES_URL: "",
      POSTGRES_PASSWORD: "",
      POSTGRES_USER: "",
      PGPASSWORD: "",
      SITE_LOCK_ADMIN_CODE: "local-playwright-owner-code",
      SITE_LOCK_STORE_DIR: mkdtempSync(join(tmpdir(), "awex-playwright-locks-")),
    },
  },
});
