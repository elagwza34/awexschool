import { adminSections } from "./admin-navigation";
import { parentSections } from "./parent-navigation";
import { staffSections } from "./staff-data";
import { studentSections } from "./student-navigation";
import { teacherSections } from "./teacher-navigation";
import type { DashboardRole } from "./types";

export const roleSections = {
  admin: adminSections,
  teacher: teacherSections,
  student: studentSections,
  parent: parentSections,
  manager: staffSections("manager"),
  support: staffSections("support"),
  "customer-service": staffSections("customer-service"),
} satisfies Record<DashboardRole, readonly { id: string; href: string; label: string }[]>;

export const contentPermissions = {
  create: "إنشاء المحتوى",
  edit: "تعديل المحتوى",
  submit: "إرسال المحتوى للمراجعة",
  withdraw: "سحب المحتوى للمسودة",
  approve: "اعتماد ونشر المحتوى",
  changes: "طلب تعديلات على المحتوى",
  unpublish: "إلغاء نشر المحتوى",
} as const;

export type ContentPermission = keyof typeof contentPermissions;
export type Permission = `page:${string}` | `content:${ContentPermission}`;

export function permissionSections(role: DashboardRole) {
  const sections: { id: string; href: string; label: string }[] = [...roleSections[role]];
  for (const section of adminSections) {
    if ((section.id === "content" || section.id === "curricula") &&
      !sections.some(({ id }) => id === section.id)) {
      sections.push({ ...section, href: `/workspace/${role}/${section.id}` });
    }
  }
  return sections;
}

export function pagePermission(role: DashboardRole, pathname: string): Permission {
  const [, root, subpath, workspace] = pathname.split("/");
  const section = (root === "workspace" ? workspace : subpath) || "overview";
  if (section === "learn") return role === "admin" ? "page:content" : "page:courses";
  return `page:${section}`;
}

export function defaultPermission(role: DashboardRole, permission: Permission): boolean {
  if (permission.startsWith("page:")) {
    return roleSections[role].some(({ id }) => permission === `page:${id}`);
  }
  if (role === "admin") return true;
  return role === "teacher" &&
    ["content:create", "content:edit", "content:submit", "content:withdraw"].includes(permission);
}
