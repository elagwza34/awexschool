import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const courseId = "11111111-1111-4111-8111-111111111111";
const unitId = "33333333-3333-4333-8333-333333333333";
const lessonId = "44444444-4444-4444-8444-444444444444";
const liveLessonBody = "نص الدرس الحي من قاعدة البيانات فقط";

globalThis.__lessonAccount = null;
globalThis.__lessonClient = null;
globalThis.__lessonOwnerCalls = 0;
globalThis.__lessonSessionCalls = [];
globalThis.__lessonEnrollmentCalls = 0;
globalThis.__lessonCourseReads = 0;
globalThis.__lessonEvents = [];
globalThis.__lessonQueries = [];
globalThis.__lessonSelects = [];

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
      return { url: "data:text/javascript,export default function Link({ children }) { return children; }", shortCircuit: true };
    }
    if (specifier === "next/navigation") {
      return {
        url: "data:text/javascript,export function notFound() { throw new Error('unexpected notFound'); } export function redirect(url) { const error = new Error(`redirect:${url}`); error.destination = url; throw error; }",
        shortCircuit: true,
      };
    }
    if (specifier === "@/features/auth/supabase-server") {
      return {
        url: `data:text/javascript,
          export async function getAccount() { return globalThis.__lessonAccount; }
          export function ownerClient() { globalThis.__lessonOwnerCalls += 1; return null; }
          export async function sessionClient(writable) {
            globalThis.__lessonSessionCalls.push(Boolean(writable));
            return globalThis.__lessonClient;
          }
        `,
        shortCircuit: true,
      };
    }
    if (specifier === "@/features/catalog/enrollment-actions") {
      return {
        url: `data:text/javascript,export async function getCourseEnrollments() {
          globalThis.__lessonEnrollmentCalls += 1;
          return { state: 'ready', data: [{ course_id: '${courseId}', status: 'active' }] };
        }`,
        shortCircuit: true,
      };
    }
    if (specifier === "@/features/catalog/live-catalog") {
      return {
        url: `data:text/javascript,export async function readPublishedCourse() {
          globalThis.__lessonCourseReads += 1;
          return { state: 'ready', data: { id: '${courseId}', title: 'مقرر الرياضيات' } };
        }`,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const { default: CourseLessons } = await import("../../src/app/(public)/courses/[courseId]/lessons/page.tsx");

function account(role) {
  return { roles: [role], user: { id: "22222222-2222-4222-8222-222222222222" } };
}

function reset({ currentAccount = account("student"), allowed = true, accessError = null, units = null } = {}) {
  globalThis.__lessonAccount = currentAccount;
  globalThis.__lessonOwnerCalls = 0;
  globalThis.__lessonSessionCalls = [];
  globalThis.__lessonEnrollmentCalls = 0;
  globalThis.__lessonCourseReads = 0;
  globalThis.__lessonEvents = [];
  globalThis.__lessonQueries = [];
  globalThis.__lessonSelects = [];
  globalThis.__lessonClient = {
    async rpc(name, args) {
      globalThis.__lessonEvents.push(["rpc", name, args]);
      return { data: allowed, error: accessError };
    },
    from(table) {
      globalThis.__lessonEvents.push(["from", table]);
      globalThis.__lessonQueries.push(table);
      const builder = {
        select(...args) { globalThis.__lessonSelects.push([table, ...args]); return builder; },
        eq(...args) { globalThis.__lessonEvents.push(["eq", table, ...args]); return builder; },
        order(...args) { globalThis.__lessonEvents.push(["order", table, ...args]); return builder; },
        then(resolve, reject) {
          return Promise.resolve(units ?? {
            data: [{
              id: unitId,
              title: "الوحدة الأولى",
              position: 1,
              lessons: [{ id: lessonId, title: "الدرس الأول", body: liveLessonBody, position: 1 }],
            }],
            error: null,
          }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}

async function renderLessons() {
  return renderToStaticMarkup(await CourseLessons({ params: Promise.resolve({ courseId }) }));
}

test("authorized lesson bodies use the session client only after the public RPC gate", async () => {
  reset({ currentAccount: account("teacher") });

  const html = await renderLessons();

  assert.deepEqual(globalThis.__lessonSessionCalls, [false]);
  assert.equal(globalThis.__lessonOwnerCalls, 0);
  assert.equal(globalThis.__lessonEnrollmentCalls, 0);
  assert.deepEqual(globalThis.__lessonEvents.slice(0, 2), [
    ["rpc", "can_read_course_lessons", { p_course_id: courseId }],
    ["from", "course_units"],
  ]);
  assert.deepEqual(globalThis.__lessonQueries, ["course_units"]);
  assert.match(globalThis.__lessonSelects[0][1], /lessons\(id,title,body,position\)/);
  assert.match(html, /دروس مقرر الرياضيات/);
  assert.match(html, /الوحدة الأولى/);
  assert.match(html, /الدرس الأول/);
  assert.match(html, new RegExp(liveLessonBody));
});

test("RPC denial cannot be overridden by local enrollment or a privileged-looking role", async () => {
  for (const role of ["student", "teacher"]) {
    reset({ currentAccount: account(role), allowed: false });

    await assert.rejects(
      () => CourseLessons({ params: Promise.resolve({ courseId }) }),
      (error) => error.destination === `/courses/${courseId}`,
    );

    assert.deepEqual(globalThis.__lessonEvents, [["rpc", "can_read_course_lessons", { p_course_id: courseId }]]);
    assert.equal(globalThis.__lessonEnrollmentCalls, 0);
    assert.equal(globalThis.__lessonOwnerCalls, 0);
  }
});

test("RPC grants admit authorized non-student roles without a client-side enrollment allowlist", async () => {
  for (const role of ["parent", "admin", "owner"]) {
    reset({ currentAccount: account(role), allowed: true });

    await CourseLessons({ params: Promise.resolve({ courseId }) });

    assert.deepEqual(globalThis.__lessonEvents.slice(0, 2), [
      ["rpc", "can_read_course_lessons", { p_course_id: courseId }],
      ["from", "course_units"],
    ]);
    assert.equal(globalThis.__lessonEnrollmentCalls, 0);
  }
});

test("anonymous or inactive identities retain public metadata access but never reach lesson queries", async () => {
  reset({ currentAccount: null });

  await assert.rejects(
    () => CourseLessons({ params: Promise.resolve({ courseId }) }),
    (error) => error.destination === `/courses/${courseId}`,
  );

  assert.equal(globalThis.__lessonCourseReads, 1);
  assert.deepEqual(globalThis.__lessonSessionCalls, []);
  assert.deepEqual(globalThis.__lessonEvents, []);
  assert.equal(globalThis.__lessonEnrollmentCalls, 0);
});

test("RPC failures and missing grants fail closed without reading or inventing lesson bodies", async () => {
  for (const scenario of [
    { allowed: null, accessError: { message: "rpc unavailable" } },
    { allowed: null, accessError: null },
  ]) {
    reset({ currentAccount: account("teacher"), ...scenario });

    const html = await renderLessons();

    assert.deepEqual(globalThis.__lessonQueries, []);
    assert.equal(globalThis.__lessonEnrollmentCalls, 0);
    assert.match(html, /تعذّر التحقق من صلاحية الدروس حاليًا/);
    assert.doesNotMatch(html, new RegExp(liveLessonBody));
  }
});
