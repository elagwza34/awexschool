import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const courseId = "11111111-1111-4111-8111-111111111111";
globalThis.__archiveHasActive = false;
globalThis.__archiveUpdates = 0;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/cache") {
      return { url: "data:text/javascript,export function revalidatePath() {}", shortCircuit: true };
    }
    if (specifier === "next/navigation") {
      return { url: "data:text/javascript,export function redirect(url) { throw new Error(`redirect:${url}`); }", shortCircuit: true };
    }
    if (specifier === "@/features/auth/supabase-server") {
      return {
        url: `data:text/javascript,
          export async function getAccount() { return { roles: ['admin'], user: { id: '22222222-2222-4222-8222-222222222222' } }; }
          export async function sessionClient() { return null; }
          export function ownerClient() {
            return { from(table) {
              const builder = {
                select() { return builder; },
                update() { if (table === 'courses') globalThis.__archiveUpdates += 1; return builder; },
                eq() { return builder; },
                maybeSingle() {
                  const data = table === 'course_enrollments' && globalThis.__archiveHasActive ? { id: '${courseId}' } : table === 'courses' ? { id: '${courseId}' } : null;
                  return Promise.resolve({ data, error: null });
                },
              };
              return builder;
            } };
          }
        `,
        shortCircuit: true,
      };
    }
    if (specifier === "@/lib/mutation-result") {
      return { url: "data:text/javascript,export function mutationOutcome(result) { return result.error || !result.data ? 'failed' : 'saved'; }", shortCircuit: true };
    }
    if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts") && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { archiveCourse } = await import("../../src/features/catalog/catalog-admin-actions.ts");

test("course archival is blocked while active enrollments exist", async () => {
  globalThis.__archiveHasActive = true;
  globalThis.__archiveUpdates = 0;

  await assert.rejects(
    () => archiveCourse(courseId, "arabic"),
    /notice=archive-failed/,
  );
  assert.equal(globalThis.__archiveUpdates, 0);
});

test("course archival remains available without active enrollments", async () => {
  globalThis.__archiveHasActive = false;
  globalThis.__archiveUpdates = 0;

  await assert.rejects(
    () => archiveCourse(courseId, "arabic"),
    /notice=archived/,
  );
  assert.equal(globalThis.__archiveUpdates, 1);
});
