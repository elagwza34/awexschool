import { spawnSync } from "node:child_process";
import config from "../playwright.config.ts";

const env = { ...process.env, ...config.webServer.env };
const build = spawnSync(process.execPath, [process.env.npm_execpath, "run", "build:test"], {
  env,
  stdio: "inherit",
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

const run = spawnSync(process.execPath, [
  "node_modules/@playwright/test/cli.js", "test", "--config=playwright.preview.config.ts",
  ...process.argv.slice(2),
], { env: { ...env, LIVESCHOOL_PREBUILT_PREVIEW: "1" }, stdio: "inherit" });
if (run.error) throw run.error;
process.exit(run.status ?? 1);
