export const dashboardRoles = [
  { role: "owner", label: "لوحة المالك" },
  { role: "admin", label: "لوحة الإدارة" },
  { role: "manager", label: "لوحة المدير" },
  { role: "support", label: "لوحة الدعم الفني" },
  { role: "teacher", label: "لوحة المدرس" },
  { role: "parent", label: "لوحة ولي الأمر" },
  { role: "student", label: "لوحة الطالب" },
] as const;

export function dashboardFor(roles: readonly string[]) {
  const dashboard = dashboardRoles.find(({ role }) => roles.includes(role));
  return dashboard ? `/${dashboard.role}` : "/account";
}
