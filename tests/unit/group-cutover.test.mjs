import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const courseId = "11111111-1111-4111-8111-111111111111";
const otherCourseId = "33333333-3333-4333-8333-333333333333";
const teacherId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const adminId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const groupId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const savedGroupId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const authoritativeStudentId = "22222222-2222-4222-8222-222222222222";
const legacyStudentId = "44444444-4444-4444-8444-444444444444";
const otherStudentId = "55555555-5555-4555-8555-555555555555";
const unenrolledStudentId = "66666666-6666-4666-8666-666666666666";
const parentId = "77777777-7777-4777-8777-777777777777";
const currentMemberId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

globalThis.__groupAccount = null;
globalThis.__groupSessionClient = null;
globalThis.__groupOwnerClient = null;
globalThis.__groupSessionCalls = [];
globalThis.__groupOwnerCalls = 0;
globalThis.__groupRpcCalls = [];

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
        url: "data:text/javascript,export function redirect(url) { const error = new Error(`redirect:${url}`); error.destination = url; throw error; } export function notFound() { throw new Error('unexpected notFound'); } export function useRouter() { return { replace() {} }; }",
        shortCircuit: true,
      };
    }
    if (specifier === "@/features/auth/supabase-server") {
      return {
        url: `data:text/javascript,
          export async function getAccount() { return globalThis.__groupAccount; }
          export async function sessionClient(writable) {
            globalThis.__groupSessionCalls.push(writable);
            return globalThis.__groupSessionClient;
          }
          export function ownerClient() {
            globalThis.__groupOwnerCalls += 1;
            return globalThis.__groupOwnerClient;
          }
        `,
        shortCircuit: true,
      };
    }
    if (specifier === "@/components/ui/button") {
      return { url: "data:text/javascript,export function Button({ children }) { return children; }", shortCircuit: true };
    }
    if (specifier === "@/components/ui/dialog") {
      return {
        url: "data:text/javascript,export function Dialog({ children }) { return children; } export function DialogContent({ children }) { return children; } export function DialogDescription({ children }) { return children; } export function DialogHeader({ children }) { return children; } export function DialogTitle({ children }) { return children; } export function DialogTrigger({ children }) { return children; }",
        shortCircuit: true,
      };
    }
    if (specifier === "./live-group-editor" && context.parentURL?.endsWith("admin-learning-groups.tsx")) {
      return { url: "data:text/javascript,export function LiveGroupEditor() { return null; }", shortCircuit: true };
    }
    if (specifier === "./group-admin-actions" && context.parentURL?.endsWith("live-group-editor.tsx")) {
      return { url: "data:text/javascript,export function saveLearningGroup() { return ''; }", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const { saveLearningGroup } = await import("../../src/features/enrollments/group-admin-actions.ts");
const { AdminLearningGroups } = await import("../../src/features/enrollments/admin-learning-groups.tsx");
const editor = await import("../../src/features/enrollments/live-group-editor.tsx");

function form(values) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (key !== "students") result.set(key, value);
  }
  for (const student of values.students ?? []) result.append("students", student);
  return result;
}

function rpcClient(kind) {
  return {
    async rpc(name, args) {
      globalThis.__groupRpcCalls.push([kind, name, args]);
      return { data: savedGroupId, error: null };
    },
  };
}

function resetAction() {
  globalThis.__groupAccount = { user: { id: adminId }, roles: ["admin"] };
  globalThis.__groupSessionClient = rpcClient("session");
  globalThis.__groupOwnerClient = rpcClient("owner");
  globalThis.__groupSessionCalls = [];
  globalThis.__groupOwnerCalls = 0;
  globalThis.__groupRpcCalls = [];
}

function adminClient(results) {
  const calls = [];
  return {
    calls,
    from(table) {
      calls.push(["from", table]);
      let result = results[table] ?? { data: [], error: null };
      const builder = {
        select(...args) {
          calls.push(["select", table, ...args]);
          if (table === "profiles") {
            result = args[0].includes("teacher_profiles!inner") ? results.teacherProfiles : results.studentProfiles;
          }
          return builder;
        },
        eq(...args) { calls.push(["eq", table, ...args]); return builder; },
        order(...args) { calls.push(["order", table, ...args]); return builder; },
        overrideTypes() { return builder; },
        then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
      };
      return builder;
    },
  };
}

const group = {
  id: groupId,
  name: "مجموعة الرياضيات",
  course_id: courseId,
  teacher_id: teacherId,
  capacity: 12,
  fee_minor: 12345,
  weekday: 1,
  starts_at_local: "10:00:00",
  active: true,
  courses: { title: "الرياضيات" },
  teacher_profiles: { full_name: "أحمد" },
  group_members: [{ count: 1 }],
};

function adminResults() {
  return {
    learning_groups: { data: [group], error: null },
    courses: { data: [{ id: courseId, title: "الرياضيات" }, { id: otherCourseId, title: "العلوم" }], error: null },
    teacherProfiles: { data: [{ user_id: teacherId, teacher_profiles: { full_name: "أحمد" } }], error: null },
    studentProfiles: {
      data: [
        { user_id: authoritativeStudentId, display_name: "طالب موثّق" },
        { user_id: legacyStudentId, display_name: "طالب قديم" },
        { user_id: otherStudentId, display_name: "طالب مقرر آخر" },
        { user_id: unenrolledStudentId, display_name: "طالب غير ملتحق" },
        { user_id: currentMemberId, display_name: "عضو حالي" },
      ],
      error: null,
    },
    course_enrollments: {
      data: [
        { course_id: courseId, student_id: authoritativeStudentId, requester_id: parentId },
        { course_id: courseId, student_id: null, requester_id: legacyStudentId },
        { course_id: otherCourseId, student_id: null, requester_id: otherStudentId },
        { course_id: courseId, student_id: currentMemberId, requester_id: currentMemberId },
      ],
      error: null,
    },
    group_members: { data: [{ student_id: currentMemberId }], error: null },
  };
}

function findNamedElement(node, name) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findNamedElement(child, name);
      if (found) return found;
    }
    return null;
  }
  if (typeof node.type === "function" && node.type.name === name) return node;
  return findNamedElement(node.props?.children, name);
}

test("group saves use the writable session client and the actor-free RPC contract", async () => {
  resetAction();
  const input = form({
    name: "  مجموعة الرياضيات  ",
    course: courseId,
    teacher: teacherId,
    capacity: "12",
    fee: "123.45",
    weekday: "1",
    time: "10:00",
    active: "on",
    students: [authoritativeStudentId, legacyStudentId, authoritativeStudentId],
  });

  await assert.rejects(
    () => saveLearningGroup(null, "", input),
    (error) => error.destination === `/admin/group-requests?saved=${savedGroupId}`,
  );

  assert.deepEqual(globalThis.__groupSessionCalls, [true]);
  assert.equal(globalThis.__groupOwnerCalls, 0);
  assert.deepEqual(globalThis.__groupRpcCalls, [["session", "save_learning_group", {
    p_group: null,
    p_course: courseId,
    p_teacher: teacherId,
    p_name: "مجموعة الرياضيات",
    p_capacity: 12,
    p_fee_minor: 12345,
    p_weekday: 1,
    p_time: "10:00",
    p_active: true,
    p_students: [authoritativeStudentId, legacyStudentId],
  }]]);
});

test("admin group options include only active students with authoritative or legacy self enrollment", async () => {
  resetAction();
  const client = adminClient(adminResults());
  globalThis.__groupOwnerClient = client;

  const tree = await AdminLearningGroups({ searchParams: Promise.resolve({ group: groupId }) });
  const editorElement = findNamedElement(tree, "LiveGroupEditor");
  assert.ok(editorElement);
  assert.deepEqual(editorElement.props.students, [
    { id: authoritativeStudentId, name: "طالب موثّق", courseIds: [courseId] },
    { id: legacyStudentId, name: "طالب قديم", courseIds: [courseId] },
    { id: otherStudentId, name: "طالب مقرر آخر", courseIds: [otherCourseId] },
  ]);
  assert.ok(client.calls.some((call) =>
    call[0] === "select" && call[1] === "profiles" && call[2].includes("account_roles!inner(role_code)") &&
    client.calls.some(([kind, table, column, value]) => kind === "eq" && table === "profiles" && column === "status" && value === "active") &&
    client.calls.some(([kind, table, column, value]) => kind === "eq" && table === "profiles" && column === "account_roles.role_code" && value === "student")
  ));
  assert.ok(client.calls.some((call) => call[0] === "from" && call[1] === "course_enrollments"));
  assert.ok(client.calls.some((call) => call[0] === "eq" && call[1] === "course_enrollments" && call[2] === "status" && call[3] === "active"));
});

test("admin group editor fails closed when enrollment eligibility cannot be loaded", async () => {
  resetAction();
  const results = adminResults();
  results.course_enrollments = { data: null, error: { message: "enrollment unavailable" } };
  globalThis.__groupOwnerClient = adminClient(results);

  const tree = await AdminLearningGroups({ searchParams: Promise.resolve({ group: groupId }) });
  assert.equal(findNamedElement(tree, "LiveGroupEditor"), null);
  assert.match(renderToStaticMarkup(tree), /تعذّر تحميل بيانات المجموعات/);
});

const studentOptions = [
  { id: authoritativeStudentId, name: "طالب موثّق", courseIds: [courseId] },
  { id: legacyStudentId, name: "طالب قديم", courseIds: [courseId] },
  { id: otherStudentId, name: "طالب مقرر آخر", courseIds: [otherCourseId] },
  { id: unenrolledStudentId, name: "طالب غير ملتحق", courseIds: [] },
];

test("the group editor derives selectable students from the selected course", () => {
  const filter = editor.studentsForCourse;
  assert.equal(typeof filter, "function", "course-specific student filtering must be available to the editor");
  assert.deepEqual(filter(studentOptions, courseId), studentOptions.slice(0, 2));
  assert.deepEqual(filter(studentOptions, otherCourseId), [studentOptions[2]]);
  assert.deepEqual(filter(studentOptions, ""), []);
});

test("the group editor identifies known-invalid selections before submission", () => {
  const invalidSelections = editor.invalidStudentSelections;
  assert.equal(typeof invalidSelections, "function", "stale student selections must be validated before submission");
  assert.deepEqual(
    invalidSelections(studentOptions, courseId, new Set([authoritativeStudentId, otherStudentId, unenrolledStudentId])),
    [otherStudentId, unenrolledStudentId],
  );
  assert.deepEqual(invalidSelections(studentOptions, courseId, new Set([legacyStudentId])), []);
  assert.deepEqual(invalidSelections(studentOptions, "", new Set([authoritativeStudentId])), [authoritativeStudentId]);
});

test("the rendered group editor hides students who are not enrolled in the group course", () => {
  const html = renderToStaticMarkup(React.createElement(editor.LiveGroupEditor, {
    group,
    courses: [{ id: courseId, name: "الرياضيات" }, { id: otherCourseId, name: "العلوم" }],
    teachers: [{ id: teacherId, name: "أحمد" }],
    students: studentOptions,
    memberCount: 1,
  }));

  assert.match(html, /طالب موثّق/);
  assert.match(html, /طالب قديم/);
  assert.doesNotMatch(html, /طالب مقرر آخر/);
  assert.doesNotMatch(html, /طالب غير ملتحق/);
  assert.doesNotMatch(html, /عضو حالي/);
});

test("the rendered group editor offers no students until a course is selected", () => {
  const html = renderToStaticMarkup(React.createElement(editor.LiveGroupEditor, {
    courses: [{ id: courseId, name: "الرياضيات" }, { id: otherCourseId, name: "العلوم" }],
    teachers: [{ id: teacherId, name: "أحمد" }],
    students: studentOptions,
    memberCount: 0,
  }));

  assert.doesNotMatch(html, /طالب موثّق/);
  assert.doesNotMatch(html, /طالب قديم/);
  assert.doesNotMatch(html, /طالب مقرر آخر/);
  assert.doesNotMatch(html, /طالب غير ملتحق/);
});
