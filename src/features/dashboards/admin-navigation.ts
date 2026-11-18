export const adminSections = [
  { id: "overview", href: "/admin", label: "نظرة عامة" },
  { id: "users", href: "/admin/users", label: "المستخدمون والأدوار" },
  { id: "enrollments", href: "/admin/enrollments", label: "الربط والمجموعات" },
  { id: "team", href: "/admin/team", label: "فريق الإدارة" },
  { id: "content", href: "/admin/content", label: "إدارة المحتوى" },
  { id: "integrations", href: "/admin/integrations", label: "ربط Meet وZoom" },
  { id: "chat", href: "/admin/chat", label: "المحادثات" },
  { id: "schedule", href: "/admin/schedule", label: "الجدول الأسبوعي" },
  {
    id: "assignments",
    href: "/admin/assignments",
    label: "الواجبات والتكليفات",
  },
] as const;

export type AdminReportSection = "schedule";
