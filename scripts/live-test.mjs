import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readSupabaseEnvironment } from "../src/lib/environment.ts";

const root = fileURLToPath(new URL("../", import.meta.url));

export function assertLiveTestEnvironment(env = process.env) {
  if (env.LIVESCHOOL_LIVE_TESTS !== "1") {
    throw new Error("Set LIVESCHOOL_LIVE_TESTS=1 only for an approved disposable local Supabase instance.");
  }
  const configuration = readSupabaseEnvironment(env);
  if (!configuration?.key || !configuration.secretKey) {
    throw new Error("Explicitly allowlisted local publishable and secret keys are required.");
  }
  return configuration;
}

export function evaluateLiveRun({ status, stats }) {
  if (status !== 0) return `Playwright exited with status ${status ?? "unknown"}.`;
  if (!stats) return "Playwright did not produce a JSON report.";
  if (stats.expected < 1) return "No mandatory live tests executed; an all-skipped run cannot satisfy the gate.";
  if (stats.skipped > 0) return `${stats.skipped} mandatory live test(s) were skipped.`;
  if (stats.flaky > 0) return `${stats.flaky} mandatory live test(s) were flaky.`;
  if (stats.unexpected > 0) return `${stats.unexpected} mandatory live test(s) failed.`;
  return null;
}

async function main() {
  const directory = mkdtempSync(join(tmpdir(), "liveschool-live-qa-"));
  const reportPath = join(directory, "report.json");
  try {
    assertLiveTestEnvironment();
    const result = spawnSync(process.execPath, [
      fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url)),
      "test",
      "--config=playwright.live.config.ts",
      "--reporter=json",
    ], {
      cwd: root,
      env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: reportPath },
      stdio: "inherit",
    });
    if (result.error) throw result.error;
    let stats = null;
    try {
      stats = JSON.parse(readFileSync(reportPath, "utf8")).stats;
    } catch {
      stats = null;
    }
    const failure = evaluateLiveRun({ status: result.status, stats });
    if (failure) {
      console.error(`Live QA BLOCKED: ${failure}`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`Live QA BLOCKED: ${error instanceof Error ? error.message : "unsafe live test environment"}`);
    process.exitCode = 1;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main();
