import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

const webServer = base.webServer;
if (!webServer || Array.isArray(webServer)) throw new Error("Expected one Playwright web server.");

const config = defineConfig({
  ...base,
  testMatch: [
    "live-auth.spec.ts",
    "live-data.spec.ts",
    "site-access.spec.ts",
    "phase-01-preview.spec.ts",
  ],
  webServer: {
    ...webServer,
    timeout: 180_000,
  },
});

export default config;
