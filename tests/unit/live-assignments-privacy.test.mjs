import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const courseId = "11111111-1111-4111-8111-111111111111";
const assignmentId = "22222222-2222-4222-8222-222222222222";
const parentId = "33333333-3333-4333-8333-333333333333";
const childId = "44444444-4444-8444-8444-444444444444";

globalThis.__assignmentStudents = [];
globalThis.__assignmentExecutions = [];
globalThis.__assignmentFilters = [];

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".tsx")) {
      const source = readFileSync(fileURLToPath(url), "utf8");
      return {
        format: "module",
        source: ts.transpileModule(source, {
          compilerOptions: {
            jsx: ts.JsxEmit.ReactJSX,
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
          },
        }).outputText,
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/navigation") {
      return { url: "data:text/javascript,export function redirect() { throw new Error('unexpected redirect'); }", shortCircuit: true };
    }
    if (specifier === "@/features/auth/form-controls") {
      return { url: "data:text/javascript,export function AuthSubmit() { return null; }", shortCircuit: true };
    }
    if (specifier === "@/features/auth/supabase-server") {
      return {
        url: `data:text/javascript,
          export async function getAccount() { return { roles: ['parent'], user: { id: '${parentId}' } }; }
          export function ownerClient() { return globalThis.__assignmentClient; }
        `,
        shortCircuit: true,
      };
    }
    if (specifier === "./live-assignment-access") {
      return {
        url: `data:text/javascript,
          export function cairoDate() { return '2026-11-25'; }
          export async function assignmentScope() {
            return { ids: ['${courseId}'], students: globalThis.__assignmentStudents, error: false };
          }
        `,
        shortCircuit: true,
      };
    }
    if (specifier === "./live-assignment-actions") {
      return {
        url: "data:text/javascript,export function publishPortalAssignment() {} export function reviewPortalAssignment() {} export function submitPortalAssignment() {}",
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const { LiveAssignments } = await import("../../src/features/dashboards/live-assignments.tsx");

function client() {
  return {
    from(table) {
      const builder = {
        select() { return builder; },
        order() { return builder; },
        limit() { return builder; },
        in(column, values) {
          if (table === "course_assignment_submissions") globalThis.__assignmentFilters.push([column, values]);
          return builder;
        },
        eq() { return builder; },
        then(resolve, reject) {
          globalThis.__assignmentExecutions.push(table);
          const data = table === "course_assignments"
            ? [{ id: assignmentId, title: "Assignment", instructions: "Instructions", due_on: null }]
            : [{ assignment_id: assignmentId, student_id: childId, response: "Private response", feedback: null, profiles: { display_name: "Child" } }];
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}

async function render(students) {
  globalThis.__assignmentStudents = students;
  globalThis.__assignmentExecutions = [];
  globalThis.__assignmentFilters = [];
  globalThis.__assignmentClient = client();
  await LiveAssignments({ role: "parent", searchParams: Promise.resolve({}) });
}

test("parent assignment views do not execute submission reads without linked children", async () => {
  await render([]);
  assert.equal(globalThis.__assignmentExecutions.includes("course_assignment_submissions"), false);
});

test("parent assignment views scope executed submission reads to linked children", async () => {
  await render([childId]);
  assert.equal(globalThis.__assignmentExecutions.includes("course_assignment_submissions"), true);
  assert.ok(globalThis.__assignmentFilters.some(([column, values]) =>
    column === "student_id" && values.length === 1 && values[0] === childId
  ));
});
