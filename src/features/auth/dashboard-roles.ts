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

const sections: Partial<Record<DashboardRole, readonly DashboardLink[]>> = {
  owner: [
    { href: "/admin/catalog", label: "المقررات والالتحاق" },
    { href: "/admin/teacher-applications", label: "طلبات المدرسين" },
  ],
  admin: [
    { href: "/admin/catalog", label: "المقررات والالتحاق" },
    { href: "/admin/teacher-applications", label: "طلبات المدرسين" },
  ],
  teacher: [
    { href: "/teacher/courses", label: "مقرراتي" },
    { href: "/teacher/profile", label: "الملف الشخصي" },
  ],
  parent: [{ href: "/parent/courses", label: "مقررات الأبناء" }],
  student: [
    { href: "/student/courses", label: "مقرراتي" },
    { href: "/student/profile", label: "الملف الشخصي" },
  ],
};

export function dashboardLinks(role: DashboardRole) {
  return [
    { href: `/${role}`, label: "نظرة عامة" },
    ...(sections[role] ?? []),
  ];
}

export const liveDashboardPaths = new Set(dashboardRoles.flatMap(({ role }) => dashboardLinks(role).map(({ href }) => href)));

export function dashboardFor(roles: readonly string[]) {
  const dashboard = dashboardRoles.find(({ role }) => roles.includes(role));
  return dashboard ? `/${dashboard.role}` : "/account";
}
