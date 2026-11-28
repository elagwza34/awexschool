import { spawnSync } from "node:child_process";
import config from "../playwright.config.ts";

const env = { ...process.env, ...config.webServer.env };
const build = spawnSync(process.execPath, [process.env.npm_execpath, "run", "build:test"], {
  env,
  stdio: "inherit",
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

const args = process.argv.slice(2);
const specifiedProject = args.some((arg) => arg === "--project" || arg.startsWith("--project="));
const projects = specifiedProject ? [null] : ["chromium", "firefox", "webkit"];
let exitCode = 0;
for (const project of projects) {
  const run = spawnSync(process.execPath, [
    "node_modules/@playwright/test/cli.js", "test", "--config=playwright.preview.config.ts",
    ...(project ? ["--project", project, "--output", `test-results/${project}`] : []),
    ...args,
  ], {
    env: {
      ...env,
      LIVESCHOOL_PREBUILT_PREVIEW: "1",
      ...(project ? { PLAYWRIGHT_HTML_OUTPUT_DIR: `playwright-report/${project}` } : {}),
    },
    stdio: "inherit",
  });
  if (run.error) throw run.error;
  if (run.status !== 0) exitCode = run.status ?? 1;
}
process.exit(exitCode);
