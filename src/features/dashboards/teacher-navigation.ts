export const teacherSections = [
  { id: "overview", href: "/teacher", label: "نظرة عامة" },
  { id: "profile", href: "/teacher/profile", label: "بروفايل المدرس" },
  { id: "courses", href: "/teacher/courses", label: "مقرراتي" },
  { id: "content", href: "/teacher/content", label: "إدارة المحتوى" },
  { id: "groups", href: "/teacher/groups", label: "مجموعاتي وطلابي" },
  { id: "sessions", href: "/teacher/sessions", label: "الحصص والاجتماعات" },
  { id: "schedule", href: "/teacher/schedule", label: "الجدول الأسبوعي" },
  { id: "attendance", href: "/teacher/attendance", label: "الحضور والغياب" },
  {
    id: "assignments",
    href: "/teacher/assignments",
    label: "الواجبات والتكليفات",
  },
  { id: "progress", href: "/teacher/progress", label: "التقدّم والنشاط" },
  { id: "reviews", href: "/teacher/reviews", label: "أعمال للمراجعة" },
  { id: "chat", href: "/teacher/chat", label: "شات الطلاب" },
  { id: "admin-chat", href: "/teacher/admin-chat", label: "شات الإدارة" },
] as const;

export type TeacherOverviewSection =
  "overview" | "courses" | "schedule" | "progress" | "reviews";
