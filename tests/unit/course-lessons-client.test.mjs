import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const courseId = "11111111-1111-4111-8111-111111111111";
globalThis.__lessonOwnerCalls = 0;
globalThis.__lessonSessionCalls = 0;
globalThis.__lessonQueries = [];

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".tsx")) {
      return {
        format: "module",
        source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
          compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
        }).outputText,
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/link") {
      return { url: "data:text/javascript,export default function Link() { return null; }", shortCircuit: true };
    }
    if (specifier === "next/navigation") {
      return { url: "data:text/javascript,export function notFound() { throw new Error('unexpected notFound'); } export function redirect() { throw new Error('unexpected redirect'); }", shortCircuit: true };
    }
    if (specifier === "@/features/auth/supabase-server") {
      return {
        url: `data:text/javascript,
          export async function getAccount() { return { roles: ['student'], user: { id: '22222222-2222-4222-8222-222222222222' } }; }
          export function ownerClient() { globalThis.__lessonOwnerCalls += 1; return null; }
          export async function sessionClient() {
            globalThis.__lessonSessionCalls += 1;
            return { from(table) {
              globalThis.__lessonQueries.push(table);
              const builder = {
                select() { return builder; },
                eq() { return builder; },
                order() { return builder; },
                then(resolve, reject) { return Promise.resolve({ data: [], error: null }).then(resolve, reject); },
              };
              return builder;
            } };
          }
        `,
        shortCircuit: true,
      };
    }
    if (specifier === "@/features/catalog/enrollment-actions") {
      return {
        url: `data:text/javascript,export async function getCourseEnrollments() {
          return { state: 'ready', data: [{ course_id: '${courseId}', status: 'active' }] };
        }`,
        shortCircuit: true,
      };
    }
    if (specifier === "@/features/catalog/live-catalog") {
      return {
        url: `data:text/javascript,export async function readPublishedCourse() {
          return { state: 'ready', data: { id: '${courseId}', title: 'Course' } };
        }`,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const { default: CourseLessons } = await import("../../src/app/(public)/courses/[courseId]/lessons/page.tsx");

test("enrolled course lessons use the RLS-bearing session client after the enrollment gate", async () => {
  globalThis.__lessonOwnerCalls = 0;
  globalThis.__lessonSessionCalls = 0;
  globalThis.__lessonQueries = [];

  await CourseLessons({ params: Promise.resolve({ courseId }) });

  assert.equal(globalThis.__lessonOwnerCalls, 0);
  assert.equal(globalThis.__lessonSessionCalls, 1);
  assert.deepEqual(globalThis.__lessonQueries, ["course_units"]);
});
