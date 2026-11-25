import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/navigation") {
      return { url: "data:text/javascript,export function redirect(url) { throw new Error(`redirect:${url}`); }", shortCircuit: true };
    }
    if (specifier === "@/features/auth/supabase-server") {
      return {
        url: `data:text/javascript,
          export async function getAccount() {
            return { roles: ['student'], name: 'Student', user: { id: '22222222-2222-4222-8222-222222222222' } };
          }
          export function ownerClient() { return null; }
          export async function sessionClient() { return null; }
        `,
        shortCircuit: true,
      };
    }
    if (specifier === "./live-catalog") {
      return {
        url: `data:text/javascript,
          export async function readPublishedCourse() {
            return { state: 'ready', data: { id: '11111111-1111-4111-8111-111111111111' } };
          }
        `,
        shortCircuit: true,
      };
    }
    if (specifier === "./catalog-data") {
      return { url: "data:text/javascript,export async function loadCourseEnrollments() { return null; }", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const { enrollInCourse } = await import("../../src/features/catalog/enrollment-actions.ts");

test("course enrollment fails closed when the write client is unavailable", async () => {
  await assert.rejects(
    () => enrollInCourse("11111111-1111-4111-8111-111111111111", new FormData()),
    /redirect:\/courses\/11111111-1111-4111-8111-111111111111\?enrollment=failed/,
  );
});
