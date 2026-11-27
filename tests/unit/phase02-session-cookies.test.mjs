import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const state = { writes: [] };
globalThis.__phase02CookieState = state;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,export {}", shortCircuit: true };
    }
    if (specifier === "@supabase/ssr") {
      return {
        url: `data:text/javascript,
          export function createServerClient(url, key, options) {
            globalThis.__phase02CookieState.options = options;
            return { url, key };
          }
        `,
        shortCircuit: true,
      };
    }
    if (specifier === "@supabase/supabase-js") {
      return { url: "data:text/javascript,export function createClient() { return {}; }", shortCircuit: true };
    }
    if (specifier === "next/headers") {
      return {
        url: `data:text/javascript,
          export async function cookies() {
            return {
              getAll() { return []; },
              set(name, value, options) { globalThis.__phase02CookieState.writes.push([name, value, options]); },
            };
          }
        `,
        shortCircuit: true,
      };
    }
    if (specifier === "react") {
      return { url: "data:text/javascript,export function cache(fn) { return fn; }", shortCircuit: true };
    }
    if (specifier === "@/lib/environment") {
      return {
        url: "data:text/javascript,export function readSupabaseEnvironment() { return { url: 'http://127.0.0.1:54321', key: 'test-key' }; }",
        shortCircuit: true,
      };
    }
    if (specifier.startsWith("./") && !specifier.endsWith(".ts")) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { sessionClient } = await import("../../src/features/auth/supabase-server.ts");
const previousNodeEnv = process.env.NODE_ENV;

test.after(() => {
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
});

test("writable production sessions explicitly mark auth cookies Secure", async () => {
  process.env.NODE_ENV = "production";
  await sessionClient(true);
  const { cookies } = state.options;

  cookies.setAll([{ name: "sb-test-auth-token", value: "test", options: {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false,
  } }]);

  assert.equal(state.writes.length, 1);
  assert.equal(state.writes[0][2].secure, true);
  assert.equal(state.writes[0][2].httpOnly, true);
  assert.equal(state.writes[0][2].sameSite, "lax");
});
