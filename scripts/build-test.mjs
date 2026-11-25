import { spawn } from "node:child_process";
import { readSupabaseEnvironment } from "../src/lib/environment.ts";

if (process.env.NEXT_PUBLIC_LIVESCHOOL_ENV !== "test") {
  console.error("Test builds require NEXT_PUBLIC_LIVESCHOOL_ENV=test.");
  process.exit(1);
}

try {
  readSupabaseEnvironment();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unsafe test environment.");
  process.exit(1);
}

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error("Run test builds through npm run build:test.");
  process.exit(1);
}

const child = spawn(process.execPath, [npmCli, "run", "build"], { stdio: "inherit" });

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
child.on("exit", (code) => process.exit(code ?? 1));
