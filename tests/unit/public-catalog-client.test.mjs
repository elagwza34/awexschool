import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

globalThis.__publicCatalogClientCalls = [];

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,export {}", shortCircuit: true };
    }
    if (specifier === "react") {
      return { url: "data:text/javascript,export const cache=(fn)=>fn", shortCircuit: true };
    }
    if (specifier === "@/features/auth/supabase-server") {
      return {
        url: `data:text/javascript,
          const client = {
            from(table) {
              globalThis.__publicCatalogClientCalls.push(['from', table]);
              const builder = {
                select(...args) { globalThis.__publicCatalogClientCalls.push(['select', ...args]); return builder; },
                eq(...args) { globalThis.__publicCatalogClientCalls.push(['eq', ...args]); return builder; },
                order(...args) { globalThis.__publicCatalogClientCalls.push(['order', ...args]); return builder; },
                then(resolve, reject) { return Promise.resolve({ data: [], error: null }).then(resolve, reject); },
              };
              return builder;
            },
          };
          export async function sessionClient() { globalThis.__publicCatalogClientCalls.push(['sessionClient']); return client; }
          export function ownerClient() { globalThis.__publicCatalogClientCalls.push(['ownerClient']); return client; }
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

const { listPublishedCourses } = await import("../../src/features/catalog/live-catalog.ts");

test("public catalog reads use the RLS-bearing session client", async () => {
  globalThis.__publicCatalogClientCalls = [];
  assert.deepEqual(await listPublishedCourses(), { state: "ready", data: [] });
  assert.equal(globalThis.__publicCatalogClientCalls[0][0], "sessionClient");
  assert.equal(globalThis.__publicCatalogClientCalls.some(([name]) => name === "ownerClient"), false);
});

test("public teacher pages use the RLS-bearing session client", async () => {
  for (const path of [
    "src/app/(public)/teachers/page.tsx",
    "src/app/(public)/teachers/[teacherId]/page.tsx",
  ]) {
    const source = await read(path);
    assert.match(source, /sessionClient/, `${path} must use sessionClient`);
    assert.doesNotMatch(source, /ownerClient/, `${path} must not bypass teacher RLS`);
  }
});

test("public groups and teacher application references avoid service-role reads", async () => {
  for (const path of [
    "src/app/(public)/groups/page.tsx",
    "src/app/(public)/teachers/apply/page.tsx",
  ]) {
    const source = await read(path);
    assert.match(source, /sessionClient/, `${path} must use the RLS-bearing client`);
    assert.doesNotMatch(source, /ownerClient/, `${path} must not bypass public RLS`);
  }
});

test("teacher course views include active group teaching assignments", async () => {
  for (const path of [
    "src/features/dashboards/live-assignment-access.ts",
    "src/features/catalog/teacher-courses.tsx",
  ]) {
    const source = await read(path);
    assert.match(source, /learning_groups/, `${path} must include group teaching scope`);
    assert.match(source, /teacher_id/, `${path} must scope groups to the signed-in teacher`);
  }
});

test("the disabled attachment endpoint cannot access chat storage", async () => {
  const source = await read("src/app/api/chat-attachment/route.ts");
  assert.doesNotMatch(source, /chat-attachments|createSignedUrl/);
  assert.match(source, /status:\s*404/);
});
