import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

globalThis.__settingsReadCalls = [];

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,export {}", shortCircuit: true };
    }
    if (specifier === "next/headers") {
      return {
        url: "data:text/javascript,export async function cookies(){return {getAll(){return []},set(){}}}",
        shortCircuit: true,
      };
    }
    if (specifier === "react") {
      return { url: "data:text/javascript,export const cache=(fn)=>fn", shortCircuit: true };
    }
    if (specifier === "@/lib/environment") {
      return {
        url: "data:text/javascript,export function readSupabaseEnvironment(){return {url:'http://127.0.0.1:54321',key:'local-test-key',secretKey:'local-secret-key'}}",
        shortCircuit: true,
      };
    }
    if (specifier === "@supabase/ssr") {
      return { url: "data:text/javascript,export function createServerClient(){throw new Error('unexpected session client')}", shortCircuit: true };
    }
    if (specifier === "@supabase/supabase-js") {
      return {
        url: `data:text/javascript,
          export function createClient() {
            const builder = {
              select(...args) { globalThis.__settingsReadCalls.push(['select', ...args]); return builder; },
              eq(...args) { globalThis.__settingsReadCalls.push(['eq', ...args]); return builder; },
              single() { globalThis.__settingsReadCalls.push(['single']); return Promise.resolve({ data: { demo_enabled: true }, error: null }); },
              maybeSingle() { globalThis.__settingsReadCalls.push(['maybeSingle']); return Promise.resolve({ data: { social_links: { docs: 'https://example.test' } }, error: null }); },
            };
            return { from(table) { globalThis.__settingsReadCalls.push(['from', table]); return builder; } };
          }
        `,
        shortCircuit: true,
      };
    }
    if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts") && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { getSocialLinks, isDemoEnabled } = await import("../../src/features/auth/supabase-server.ts");

test("public settings reads never filter on the ungranted id column", async () => {
  globalThis.__settingsReadCalls = [];
  const links = await getSocialLinks();
  const demo = await isDemoEnabled();

  assert.equal(links.docs, "https://example.test");
  assert.equal(demo, true);
  assert.deepEqual(globalThis.__settingsReadCalls, [
    ["from", "site_settings"],
    ["select", "social_links"],
    ["maybeSingle"],
    ["from", "site_settings"],
    ["select", "demo_enabled"],
    ["single"],
  ]);
});
