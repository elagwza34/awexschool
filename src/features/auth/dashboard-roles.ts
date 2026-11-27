import { parentSections } from "@/features/dashboards/parent-navigation";
import { studentSections } from "@/features/dashboards/student-navigation";
import { teacherSections } from "@/features/dashboards/teacher-navigation";
import { staffSections } from "@/features/dashboards/staff-data";

export const dashboardRoles = [
  { role: "owner", label: "صلاحيات المالك" },
  { role: "admin", label: "لوحة الإدارة" },
  { role: "manager", label: "لوحة المدير" },
  { role: "support", label: "لوحة الدعم الفني" },
  { role: "customer_service", label: "لوحة خدمة العملاء" },
  { role: "teacher", label: "لوحة المدرس" },
  { role: "parent", label: "لوحة ولي الأمر" },
  { role: "student", label: "لوحة الطالب" },
] as const;

export type DashboardRole = (typeof dashboardRoles)[number]["role"];

type DashboardLink = { href: string; label: string };

export const adminWorkspaceSections = [
  { id: "overview", href: "/admin", label: "نظرة عامة" },
  { id: "content", href: "/admin/catalog", label: "المقررات" },
  { id: "teachers", href: "/admin/teachers", label: "المدرسين" },
  { id: "group-requests", href: "/admin/group-requests", label: "طلبات انضمام المجموعات" },
  { id: "chat", href: "/admin/chat", label: "المحادثات" },
  { id: "schedule", href: "/admin/schedule", label: "الجدول الأسبوعي" },
  { id: "assignments", href: "/admin/assignments", label: "الواجبات والتكليفات" },
  { id: "users", href: "/account", label: "حسابي" },
] as const;

const sections: Partial<Record<DashboardRole, readonly DashboardLink[]>> = {
  teacher: teacherSections.filter(({ id }) => ["profile", "courses", "groups", "sessions", "finance", "schedule", "attendance", "assignments", "reviews", "chat", "admin-chat"].includes(id)),
  parent: parentSections.filter(({ id }) => ["courses", "schedule", "attendance", "assignments", "admin-chat"].includes(id)),
  student: studentSections.filter(({ id }) => ["courses", "schedule", "attendance", "assignments", "chat", "admin-chat"].includes(id)),
};

export function dashboardLinks(role: DashboardRole) {
  if (role === "owner" || role === "admin") return adminWorkspaceSections;
  if (role === "customer_service") return staffSections("customer-service");
  return [
    { href: `/${role}`, label: "نظرة عامة" },
    ...(sections[role] ?? []),
  ];
}

export function isAdminWorkspace(path: string) {
  return path === "/account" || path === "/admin" || path.startsWith("/admin/");
}

export const liveDashboardPaths = new Set([
  ...dashboardRoles.flatMap(({ role }) => dashboardLinks(role).map(({ href }) => href)),
  "/admin/permissions",
  "/admin/settings",
  "/admin/integrations",
  "/admin/teacher-applications",
  "/admin/finance",
]);

export function dashboardFor(roles: readonly string[]) {
  if (roles.includes("owner")) return "/admin";
  const dashboard = dashboardRoles.find(({ role }) => roles.includes(role));
  return dashboard?.role === "customer_service" ? "/customer-service" : dashboard ? `/${dashboard.role}` : "/account";
}
