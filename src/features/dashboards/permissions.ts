import { adminSections } from "./admin-navigation";
import { parentSections } from "./parent-navigation";
import { isStaffRole, staffSections } from "./staff-data";
import { studentSections } from "./student-navigation";
import { teacherSections } from "./teacher-navigation";
import type { DashboardRole } from "./types";
import { canMonitorGroupChat, groupChatHref, groupChatPermission, supportsGroupChat } from "@/features/chat/groups";
import { adminWorkspaceSections } from "@/features/auth/dashboard-roles";

export const roleSections = {
  admin: adminSections,
  teacher: teacherSections,
  student: studentSections,
  parent: parentSections,
  owner: adminWorkspaceSections,
  manager: staffSections("manager"),
  support: staffSections("support"),
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
export const userPermissions = {
  "users:create": "إضافة مستخدم",
  "users:edit": "تعديل بيانات المستخدم",
  "users:status": "تغيير حالة المستخدم",
  "users:review-teachers": "قبول أو رفض طلبات المدرسين",
} as const;

export const assignmentPermissions = {
  "assignments:create": "إنشاء واجب",
  "assignments:submit": "تسليم واجب",
  "assignments:grade": "تصحيح واجب",
} as const;
export const financePermissions = {
  "finance:rate": "تحديد سعر الحصة",
  "finance:approve": "اعتماد الحصص للمستحقات",
  "finance:pay": "تسجيل صرف مستحقات المدرس",
} as const;

export type Permission = `page:${string}` | `content:${ContentPermission}` |
  keyof typeof userPermissions | keyof typeof assignmentPermissions | keyof typeof financePermissions |
  "groups:manage" | "groups:approve";

export function permissionSections(role: DashboardRole) {
  const sections: { id: string; href: string; label: string }[] = [...roleSections[role]];
  if (isStaffRole(role)) sections.push({
    id: "group-requests", href: `/workspace/${role}/group-requests`, label: "إدارة المجموعات",
  });
  if (supportsGroupChat(role)) sections.push({
    id: "group-chat", href: groupChatHref(role),
    label: canMonitorGroupChat(role) ? "مراقبة شات المجموعات" : "شات المجموعات",
  });
  for (const section of adminSections) {
    if ((section.id === "content" || section.id === "curricula" || section.id === "users") &&
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
  if (permission === "page:help") return role === "student" || role === "parent";
  if (permission === "page:subscriptions") return role === "student";
  if (permission === "groups:manage" || permission === "page:group-requests") return role === "admin" || isStaffRole(role);
  if (permission === "groups:approve") return role === "admin";
  if (permission === groupChatPermission) return supportsGroupChat(role);
  if (permission.startsWith("page:")) {
    return roleSections[role].some(({ id }) => permission === `page:${id}`);
  }
  if (permission.startsWith("users:")) return role === "admin";
  if (permission.startsWith("finance:")) return role === "admin";
  if (permission === "assignments:submit") return role === "student";
  if (permission === "assignments:create" || permission === "assignments:grade") return role === "teacher";
  if (role === "admin") return true;
  return role === "teacher" &&
    ["content:create", "content:edit", "content:submit", "content:withdraw"].includes(permission);
}
