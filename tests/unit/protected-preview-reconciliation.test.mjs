import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

globalThis.__previewCatalogState = "ready";
globalThis.__previewAttendanceMode = "error";

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
    if (specifier === "server-only") return { url: "data:text/javascript,export {}", shortCircuit: true };
    if (specifier === "next/link") {
      return { url: "data:text/javascript,export default function Link() { return null; }", shortCircuit: true };
    }
    if (specifier === "next/navigation") {
      return { url: "data:text/javascript,export function redirect(url) { throw new Error(`redirect:${url}`); }", shortCircuit: true };
    }
    if (specifier === "@/lib/environment") {
      return { url: new URL("../../src/lib/environment.ts", import.meta.url).href, shortCircuit: true };
    }
    if (specifier === "@/components/layout/portal-metrics") {
      return { url: "data:text/javascript,export function PortalMetrics() { return null; }", shortCircuit: true };
    }
    if (specifier === "@/features/auth/form-controls") {
      return { url: "data:text/javascript,export function AuthSubmit() { return null; }", shortCircuit: true };
    }
    if (specifier === "@/features/auth/supabase-server") {
      return {
        url: `data:text/javascript,
          export async function getAccount() {
            return { roles: ['student', 'teacher'], user: { id: '22222222-2222-4222-8222-222222222222' } };
          }
          export function ownerClient() {
            return { from() {
              const builder = {
                select() { return builder; },
                eq() { return builder; },
                lte() { return builder; },
                neq() { return builder; },
                order() { return builder; },
                limit() { return builder; },
                then(resolve, reject) {
                  return Promise.resolve({ data: null, error: { message: 'offline' } }).then(resolve, reject);
                },
              };
              return builder;
            } };
          }
        `,
        shortCircuit: true,
      };
    }
    if (specifier === "./enrollment-actions" && context.parentURL?.endsWith("my-courses.tsx")) {
      return {
        url: `data:text/javascript,export async function getCourseEnrollments() {
          return globalThis.__previewCatalogState === 'error'
            ? { state: 'error', kind: 'database' }
            : { state: 'ready', data: [
                { course_id: 'real-course', requester_id: 'parent-1', student_id: 'student-1', learner_name: 'Stale Learner', student: { display_name: 'Authoritative Learner' }, status: 'active' },
                { course_id: 'legacy-course', requester_id: 'parent-1', student_id: null, learner_name: 'Legacy Learner', student: null, status: 'pending' },
              ] };
        }`,
        shortCircuit: true,
      };
    }
    if (specifier === "./live-catalog" && context.parentURL?.endsWith("my-courses.tsx")) {
      return {
        url: `data:text/javascript,export async function listPublishedCourses() {
          return globalThis.__previewCatalogState === 'error'
            ? { state: 'error', kind: 'database' }
            : { state: 'ready', data: [
                { id: 'real-course', title: 'Real Course' },
                { id: 'legacy-course', title: 'Legacy Course' },
              ] };
        }`,
        shortCircuit: true,
      };
    }
    if (specifier === "./live-attendance-actions" && context.parentURL?.endsWith("live-attendance.tsx")) {
      return { url: "data:text/javascript,export async function recordPortalAttendance() {}", shortCircuit: true };
    }
    if (specifier.startsWith(".") && context.parentURL?.endsWith(".tsx") && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { MyCourses } = await import("../../src/features/catalog/my-courses.tsx");
const { LiveAttendance } = await import("../../src/features/dashboards/live-attendance.tsx");

function textOf(value) {
  if (value === null || value === undefined || typeof value === "boolean") return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textOf).join(" ");
  if (typeof value === "object" && "props" in value) return textOf(value.props.children);
  return "";
}

async function withPreviewEnvironment(value, run) {
  const previous = process.env.NEXT_PUBLIC_LIVESCHOOL_ENV;
  if (value === undefined) delete process.env.NEXT_PUBLIC_LIVESCHOOL_ENV;
  else process.env.NEXT_PUBLIC_LIVESCHOOL_ENV = value;
  try {
    return await run();
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_LIVESCHOOL_ENV;
    else process.env.NEXT_PUBLIC_LIVESCHOOL_ENV = previous;
  }
}

test("preview fixtures require an explicit test environment", async () => {
  const { isPreviewFixtureEnvironment } = await import("../../src/lib/environment.ts");
  assert.equal(isPreviewFixtureEnvironment({ NODE_ENV: "test" }), false);
  assert.equal(isPreviewFixtureEnvironment({ NEXT_PUBLIC_LIVESCHOOL_ENV: "test" }), true);
  assert.equal(isPreviewFixtureEnvironment({ LIVESCHOOL_ENV: "test" }), true);
  assert.equal(isPreviewFixtureEnvironment({ NEXT_PUBLIC_LIVESCHOOL_ENV: "production" }), false);
});

test("protected course fallback remains available only for explicit previews", async () => {
  globalThis.__previewCatalogState = "error";
  const production = await withPreviewEnvironment(undefined, () => MyCourses({ role: "student" }));
  assert.match(textOf(production), /تعذّر تحميل طلبات الالتحاق/);
  assert.doesNotMatch(textOf(production), /يوسف أحمد/);

  const preview = await withPreviewEnvironment("test", () => MyCourses({ role: "student" }));
  assert.match(textOf(preview), /تعذّر تحميل طلبات الالتحاق/);
  assert.match(textOf(preview), /يوسف أحمد/);
  assert.match(textOf(preview), /الرياضيات للصف الثاني الثانوي/);
});

test("ready course data uses authoritative learner names and retains legacy rows", async () => {
  globalThis.__previewCatalogState = "ready";
  const element = await withPreviewEnvironment("test", () => MyCourses({ role: "student" }));
  assert.match(textOf(element), /Authoritative Learner/);
  assert.match(textOf(element), /Legacy Learner/);
  assert.match(textOf(element), /Real Course/);
  assert.match(textOf(element), /Legacy Course/);
  assert.doesNotMatch(textOf(element), /Stale Learner/);
  assert.doesNotMatch(textOf(element), /يوسف أحمد/);
});

test("protected attendance fallback remains available only for explicit previews", async () => {
  const production = await withPreviewEnvironment(undefined, () => LiveAttendance({
    role: "teacher",
    searchParams: Promise.resolve({}),
  }));
  assert.match(textOf(production), /تعذّر تحميل الحضور/);
  assert.doesNotMatch(textOf(production), /حصة رياضيات - الجبر/);

  const preview = await withPreviewEnvironment("test", () => LiveAttendance({
    role: "teacher",
    searchParams: Promise.resolve({}),
  }));
  assert.match(textOf(preview), /حصة رياضيات - الجبر/);
  assert.match(textOf(preview), /بيانات تجريبية للمعاينة/);
});
