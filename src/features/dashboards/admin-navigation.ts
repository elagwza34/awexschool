export const adminSections = [
  { id: "overview", href: "/admin", label: "نظرة عامة" },
  { id: "users", href: "/admin/users", label: "المستخدمون والأدوار" },
  { id: "teacher-applications", href: "/admin/teacher-applications", label: "طلبات المدرسين" },
  { id: "enrollments", href: "/admin/enrollments", label: "الربط والمجموعات" },
  { id: "group-requests", href: "/admin/group-requests", label: "طلبات انضمام المجموعات" },
  { id: "team", href: "/admin/team", label: "فريق الإدارة" },
  { id: "content", href: "/admin/content", label: "إدارة المحتوى" },
  { id: "curricula", href: "/admin/curricula", label: "إدارة المناهج" },
  { id: "integrations", href: "/admin/integrations", label: "ربط Meet وZoom" },
  { id: "chat", href: "/admin/chat", label: "المحادثات" },
  { id: "schedule", href: "/admin/schedule", label: "الجدول الأسبوعي" },
  { id: "finance", href: "/admin/finance", label: "مستحقات المدرسين" },
  {
    id: "assignments",
    href: "/admin/assignments",
    label: "الواجبات والتكليفات",
  },
] as const;

export type AdminReportSection = "schedule";
