import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

const webServer = base.webServer;
if (!webServer || Array.isArray(webServer)) throw new Error("Expected one Playwright web server.");

const prebuilt = process.env.LIVESCHOOL_PREBUILT_PREVIEW === "1";
const httpsUrl = "https://127.0.0.1:3143";

const config = defineConfig({
  ...base,
  use: { ...base.use, ...(prebuilt && { baseURL: httpsUrl, ignoreHTTPSErrors: true }) },
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
    ...(prebuilt && {
      command: "node scripts/preview-https.mjs",
      url: httpsUrl,
      ignoreHTTPSErrors: true,
      timeout: 60_000,
    }),
  },
});

export default config;
