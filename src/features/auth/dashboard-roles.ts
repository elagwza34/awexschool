import { adminSections } from "@/features/dashboards/admin-navigation";
import { parentSections } from "@/features/dashboards/parent-navigation";
import { studentSections } from "@/features/dashboards/student-navigation";
import { teacherSections } from "@/features/dashboards/teacher-navigation";

export const dashboardRoles = [
  { role: "owner", label: "لوحة المالك" },
  { role: "admin", label: "لوحة الإدارة" },
  { role: "manager", label: "لوحة المدير" },
  { role: "support", label: "لوحة الدعم الفني" },
  { role: "teacher", label: "لوحة المدرس" },
  { role: "parent", label: "لوحة ولي الأمر" },
  { role: "student", label: "لوحة الطالب" },
] as const;

export type DashboardRole = (typeof dashboardRoles)[number]["role"];

type DashboardLink = { href: string; label: string };

export const ownerSections = [
  { id: "overview", href: "/owner", label: "نظرة عامة" },
  { id: "users", href: "/account", label: "المستخدمون والأدوار" },
  { id: "content", href: "/admin/catalog", label: "إدارة المحتوى" },
  { id: "teacher-applications", href: "/admin/teacher-applications", label: "طلبات المدرسين" },
  { id: "integrations", href: "/admin/integrations", label: "ربط Meet وZoom" },
] as const;

const sections: Partial<Record<DashboardRole, readonly DashboardLink[]>> = {
  admin: [
    { href: "/admin/catalog", label: "المقررات والالتحاق" },
    ...adminSections.filter(({ id }) => ["teacher-applications", "group-requests", "chat", "schedule", "finance", "assignments"].includes(id)),
  ],
  teacher: teacherSections.filter(({ id }) => ["profile", "courses", "groups", "sessions", "finance", "schedule", "attendance", "assignments", "reviews", "chat", "admin-chat"].includes(id)),
  parent: parentSections.filter(({ id }) => ["courses", "schedule", "attendance", "assignments", "admin-chat"].includes(id)),
  student: studentSections.filter(({ id }) => ["courses", "schedule", "attendance", "assignments", "chat", "admin-chat"].includes(id)),
};

export function dashboardLinks(role: DashboardRole) {
  if (role === "owner") return ownerSections;
  return [
    { href: `/${role}`, label: "نظرة عامة" },
    ...(sections[role] ?? []),
  ];
}

export function isOwnerWorkspace(path: string) {
  return path === "/account" || path === "/owner" || path.startsWith("/owner/") || path === "/admin" || path.startsWith("/admin/");
}

export const liveDashboardPaths = new Set([
  ...dashboardRoles.flatMap(({ role }) => dashboardLinks(role).map(({ href }) => href)),
  "/owner/permissions",
  "/owner/settings",
]);

export function dashboardFor(roles: readonly string[]) {
  const dashboard = dashboardRoles.find(({ role }) => roles.includes(role));
  return dashboard ? `/${dashboard.role}` : "/account";
}
