import { defineConfig } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  testDir: "./tests/live",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run build && npm run start -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      LIVESCHOOL_ENV: "test",
      NEXT_PUBLIC_LIVESCHOOL_ENV: "test",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ?? "",
      LIVESCHOOL_TEST_ALLOW_SERVICE_ROLE: "1",
      SUPABASE_ACCESS_TOKEN: "",
      SUPABASE_DB_PASSWORD: "",
      DATABASE_URL: "",
      POSTGRES_URL: "",
      POSTGRES_PASSWORD: "",
      LIVESCHOOL_WEB_ORIGIN: "http://127.0.0.1:3100",
      SITE_LOCK_ADMIN_CODE: "local-playwright-owner-code",
      SITE_LOCK_STORE_DIR: mkdtempSync(join(tmpdir(), "liveschool-live-locks-")),
    },
  },
});
