import { courses, teachers, getGrade } from "@/features/catalog/mock-data";
import { children, demoUsers } from "@/features/dashboards/mock-data";
import type { DemoUser } from "@/features/dashboards/types";

export interface PreviewAccount extends DemoUser {
  entityId: string;
  kind: "student" | "parent" | "teacher" | "admin";
}
export interface LearningGroup {
  id: string;
  name: string;
  courseId: string;
  studentIds: string[];
  active: boolean;
}
export interface GuardianLink {
  parentId: string;
  studentId: string;
}
export type MutationResult = { ok: true } | { ok: false; error: string };
const entities: Record<string, string> = {
  u1: "youssef",
  u2: "salma",
  u3: "malak",
  u4: "preview-parent",
  u5: "ahmed-hassan",
  u6: "preview-admin",
};
const kinds: Record<string, PreviewAccount["kind"]> = {
  طالب: "student",
  "ولي أمر": "parent",
  مدرس: "teacher",
  إدارة: "admin",
};
export const accountFixtures: PreviewAccount[] = [
  ...demoUsers.map((user) => ({
    ...user,
    entityId: entities[user.id],
    kind: kinds[user.role],
  })),
  ...teachers
    .filter((teacher) => teacher.id !== "ahmed-hassan")
    .map((teacher) => ({
      id: `teacher-${teacher.id}`,
      entityId: teacher.id,
      kind: "teacher" as const,
      name: teacher.name,
      email: `${teacher.id}@example.com`,
      role: "مدرس",
      status: "نشط" as const,
    })),
];
export const studentFixtures = accountFixtures
  .filter((account) => account.kind === "student")
  .map((account) => ({
    id: account.entityId,
    accountId: account.id,
    gradeId: account.entityId === "salma" ? "primary-4" : "preparatory-1",
  }));
export const courseAssignmentFixtures: Record<string, string> =
  Object.fromEntries(courses.map((course) => [course.id, course.teacherId]));
export const groupFixtures: LearningGroup[] = courses.map((course) => ({
  id: `group-${course.id}`,
  name: `${getGrade(course.gradeId)?.name} · ${course.title}`,
  courseId: course.id,
  studentIds: children
    .filter((child) =>
      child.courses.some((entry) => entry.courseId === course.id),
    )
    .map((child) => child.id),
  active: true,
}));
export const guardianLinkFixtures: GuardianLink[] = children.map((child) => ({
  parentId: "u4",
  studentId: child.id,
}));
