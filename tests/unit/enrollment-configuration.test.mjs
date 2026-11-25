import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const courseId = "11111111-1111-4111-8111-111111111111";
const studentId = "22222222-2222-4222-8222-222222222222";
const childId = "33333333-3333-4333-8333-333333333333";

globalThis.__enrollmentAccount = { roles: ["student"], name: "Student", user: { id: studentId } };
globalThis.__enrollmentClient = null;
globalThis.__enrollmentSessionCalls = [];

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
    if (specifier === "next/navigation") {
      return { url: "data:text/javascript,export function redirect(url) { throw new Error(`redirect:${url}`); } export function notFound() { throw new Error('notFound'); }", shortCircuit: true };
    }
    if (specifier === "next/cache") {
      return { url: "data:text/javascript,export function revalidatePath() {}", shortCircuit: true };
    }
    if (specifier === "@/lib/mutation-result") {
      return { url: new URL("../../src/lib/mutation-result.ts", import.meta.url).href, shortCircuit: true };
    }
    if (specifier === "next/link") {
      return { url: "data:text/javascript,export default function Link() { return null; }", shortCircuit: true };
    }
    if (specifier === "@/components/shared") {
      return { url: "data:text/javascript,export function Breadcrumbs() { return null; }", shortCircuit: true };
    }
    if (specifier === "@/components/ui/button") {
      return { url: "data:text/javascript,export function Button() { return null; }", shortCircuit: true };
    }
    if (specifier === "@/components/live-teacher-photo") {
      return { url: "data:text/javascript,export function LiveTeacherPhoto() { return null; }", shortCircuit: true };
    }
    if (specifier === "@/features/auth/form-controls") {
      return { url: "data:text/javascript,export function AuthSubmit() { return null; }", shortCircuit: true };
    }
    if (specifier === "@/features/catalog/enrollment-actions") {
      return { url: new URL("../../src/features/catalog/enrollment-actions.ts", import.meta.url).href, shortCircuit: true };
    }
    if (specifier === "@/features/catalog/live-catalog") {
      return {
        url: `data:text/javascript,
          export async function readPublishedCourse() {
            return { state: 'ready', data: { id: '${courseId}' } };
          }
        `,
        shortCircuit: true,
      };
    }
    if (specifier === "@/features/auth/supabase-server") {
      return {
        url: `data:text/javascript,
          export async function getAccount() { return globalThis.__enrollmentAccount; }
          export function ownerClient() { throw new Error('enrollment must not use a service-role client'); }
          export async function sessionClient(writable = false) {
            globalThis.__enrollmentSessionCalls.push(writable);
            return globalThis.__enrollmentClient;
          }
        `,
        shortCircuit: true,
      };
    }
    if (specifier === "./live-catalog") {
      return {
        url: `data:text/javascript,
          export async function readPublishedCourse() {
            return { state: 'ready', data: { id: '${courseId}' } };
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

const { enrollInCourse } = await import("../../src/features/catalog/enrollment-actions.ts");
const { reviewEnrollment } = await import("../../src/features/catalog/catalog-admin-actions.ts");
const { default: CoursePage } = await import("../../src/app/(public)/courses/[courseId]/page.tsx");

function textOf(value) {
  if (value === null || value === undefined || typeof value === "boolean") return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textOf).join(" ");
  if (typeof value === "object" && "props" in value) return textOf(value.props.children);
  return "";
}

function elementsOf(value, elements = []) {
  if (Array.isArray(value)) {
    for (const child of value) elementsOf(child, elements);
  } else if (value && typeof value === "object" && "props" in value) {
    elements.push(value);
    elementsOf(value.props.children, elements);
  }
  return elements;
}

function reset(roles = ["student"]) {
  globalThis.__enrollmentAccount = { roles, name: "Account", user: { id: studentId } };
  globalThis.__enrollmentClient = null;
  globalThis.__enrollmentSessionCalls = [];
}

function rpcClient(result) {
  const calls = [];
  return {
    calls,
    async rpc(...args) {
      calls.push(args);
      return result;
    },
  };
}

function parentClient(learners, result = { data: true, error: null }) {
  const calls = [];
  const rpc = rpcClient(result);
  const builder = {
    select(...args) { calls.push(["select", ...args]); return builder; },
    eq(...args) { calls.push(["eq", ...args]); return builder; },
    then(resolve, reject) { return Promise.resolve({ data: learners, error: null }).then(resolve, reject); },
  };
  return {
    calls,
    rpcCalls: rpc.calls,
    rpc: rpc.rpc,
    from(table) {
      calls.push(["from", table]);
      assert.equal(table, "guardian_links");
      return builder;
    },
  };
}

function pageClient({ enrollments = [], learners = [] } = {}) {
  return {
    from(table) {
      const data = table === "course_enrollments" ? enrollments : table === "guardian_links" ? learners : null;
      assert.ok(data, `unexpected query for ${table}`);
      const builder = {
        select() { return builder; },
        eq() { return builder; },
        order() { return builder; },
        then(resolve, reject) { return Promise.resolve({ data, error: null }).then(resolve, reject); },
      };
      return builder;
    },
  };
}

function form(values = {}) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
}

test("course enrollment fails closed when the writable session client is unavailable", async () => {
  reset();
  await assert.rejects(
    () => enrollInCourse(courseId, new FormData()),
    /redirect:\/courses\/11111111-1111-4111-8111-111111111111\?enrollment=failed/,
  );
  assert.deepEqual(globalThis.__enrollmentSessionCalls, [true]);
});

test("student enrollment calls the RPC with a null learner and ignores submitted identities", async () => {
  reset();
  const client = rpcClient({ data: true, error: null });
  globalThis.__enrollmentClient = client;

  await assert.rejects(
    () => enrollInCourse(courseId, form({ student: studentId, learner: "Untrusted name" })),
    /redirect:\/courses\/11111111-1111-4111-8111-111111111111$/,
  );
  assert.deepEqual(client.calls, [["request_course_enrollment", { p_course: courseId, p_student: null }]]);
  assert.deepEqual(globalThis.__enrollmentSessionCalls, [true]);
});

test("a false RPC result keeps a duplicate same-learner request on the course page", async () => {
  reset();
  globalThis.__enrollmentClient = rpcClient({ data: false, error: null });

  await assert.rejects(
    () => enrollInCourse(courseId, new FormData()),
    /redirect:\/courses\/11111111-1111-4111-8111-111111111111$/,
  );
});

test("parent enrollment submits only an active linked student UUID", async () => {
  reset(["parent"]);
  const client = parentClient([{ student_id: childId, profiles: { display_name: "Child", status: "active" } }]);
  globalThis.__enrollmentClient = client;

  await assert.rejects(
    () => enrollInCourse(courseId, form({ student: childId, learner: "Untrusted name" })),
    /redirect:\/courses\/11111111-1111-4111-8111-111111111111$/,
  );
  assert.deepEqual(client.calls.filter(([name]) => name === "from" || name === "select" || name === "eq"), [
    ["from", "guardian_links"],
    ["select", "student_id,profiles!guardian_links_student_id_fkey(display_name,status)"],
    ["eq", "guardian_id", studentId],
    ["eq", "profiles.status", "active"],
  ]);
  assert.deepEqual(client.rpcCalls, [["request_course_enrollment", { p_course: courseId, p_student: childId }]]);
});

test("parent enrollment rejects missing, malformed, or unlinked learner selections", async () => {
  for (const [selection, learners] of [
    ["", []],
    ["not-a-uuid", []],
    [childId, [{ student_id: "44444444-4444-4444-8444-444444444444", profiles: { status: "active" } }]],
  ]) {
    reset(["parent"]);
    const client = parentClient(learners);
    globalThis.__enrollmentClient = client;
    await assert.rejects(
      () => enrollInCourse(courseId, form({ student: selection })),
      /enrollment=invalid/,
    );
    assert.equal(client.rpcCalls.length, 0);
  }
});

test("enrollment learner conflicts and unresolved legacy identities redirect distinctly", async () => {
  for (const [message, notice] of [
    ["enrollment_learner_conflict", "conflict"],
    ["enrollment_identity_unresolved", "identity"],
    ["database unavailable", "failed"],
  ]) {
    reset();
    globalThis.__enrollmentClient = rpcClient({ data: null, error: { message } });
    await assert.rejects(
      () => enrollInCourse(courseId, new FormData()),
      new RegExp(`redirect:/courses/${courseId}\\?enrollment=${notice}$`),
    );
  }
});

test("the course page distinguishes learner conflicts from unresolved legacy identities", async () => {
  for (const [notice, expected, unexpected] of [
    ["conflict", "مرتبط بطالب آخر", "هوية الطالب"],
    ["identity", "هوية الطالب", "مرتبط بطالب آخر"],
  ]) {
    reset();
    globalThis.__enrollmentAccount = null;
    const element = await CoursePage({
      params: Promise.resolve({ courseId }),
      searchParams: Promise.resolve({ enrollment: notice }),
    });
    const text = textOf(element);
    assert.match(text, new RegExp(expected));
    assert.doesNotMatch(text, new RegExp(unexpected));
  }
});

test("the parent course form selects linked learner UUIDs instead of free-text names", async () => {
  reset(["parent"]);
  globalThis.__enrollmentClient = pageClient({
    learners: [{ student_id: childId, profiles: { display_name: "Linked Child", status: "active" } }],
  });
  const element = await CoursePage({
    params: Promise.resolve({ courseId }),
    searchParams: Promise.resolve({}),
  });
  const elements = elementsOf(element);
  const select = elements.find((item) => item.type === "select" && item.props.name === "student");
  assert.ok(select);
  assert.equal(select.props.required, true);
  assert.ok(elements.some((item) => item.type === "option" && item.props.value === childId && textOf(item) === "Linked Child"));
  assert.equal(elements.some((item) => item.type === "input" && item.props.name === "learner"), false);
});

test("the course page keeps legacy enrollment status visible without an authoritative lessons action", async () => {
  reset(["student"]);
  globalThis.__enrollmentClient = pageClient({
    enrollments: [{
      course_id: courseId,
      requester_id: studentId,
      student_id: null,
      learner_name: "Legacy Learner",
      student: null,
      status: "active",
    }],
  });
  const element = await CoursePage({
    params: Promise.resolve({ courseId }),
    searchParams: Promise.resolve({}),
  });
  assert.match(textOf(element), /التحاقك بالمقرر مؤكد/);
  assert.match(textOf(element), /هوية الطالب/);
  const elements = elementsOf(element);
  assert.equal(elements.some((item) => item.type === "form"), false);
  assert.equal(elements.some((item) => item.props.href === `/courses/${courseId}/lessons`), false);
});

test("admin enrollment review reports unresolved legacy identity distinctly", async () => {
  reset(["admin"]);
  globalThis.__enrollmentClient = rpcClient({ data: null, error: { message: "enrollment_identity_unresolved" } });

  await assert.rejects(
    () => reviewEnrollment(courseId, studentId, form({ status: "active" })),
    /notice=identity-unresolved/,
  );
});
