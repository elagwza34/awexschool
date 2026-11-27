import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

const webServer = base.webServer;
if (!webServer || Array.isArray(webServer)) throw new Error("Expected one Playwright web server.");

const config = defineConfig({
  ...base,
  projects: ["chromium", "firefox", "webkit"].map((browserName) => ({
    name: browserName,
    use: { browserName: browserName as "chromium" | "firefox" | "webkit" },
  })),
  testMatch: [
    "live-auth.spec.ts",
    "live-data.spec.ts",
    "site-access.spec.ts",
    "phase-01-preview.spec.ts",
  ],
  webServer: {
    ...webServer,
    ...(process.env.LIVESCHOOL_PREBUILT_PREVIEW === "1" && {
      command: "npm run start -- --port 3100",
      timeout: 60_000,
    }),
  },
});

export default config;
