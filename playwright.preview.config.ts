import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

const config = defineConfig({
  ...base,
  testMatch: [
    "live-auth.spec.ts",
    "live-data.spec.ts",
    "site-access.spec.ts",
    "phase-01-preview.spec.ts",
  ],
});

export default config;
