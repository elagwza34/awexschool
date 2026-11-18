export const studentSections = [
  { id: "overview", href: "/student", label: "نظرة عامة" },
  { id: "courses", href: "/student/courses", label: "مقرراتي" },
  { id: "library", href: "/student/library", label: "المكتبة التعليمية" },
  { id: "progress", href: "/student/progress", label: "التقدّم والنشاط" },
  { id: "schedule", href: "/student/schedule", label: "الجدول الأسبوعي" },
  { id: "attendance", href: "/student/attendance", label: "الحضور والغياب" },
  {
    id: "assignments",
    href: "/student/assignments",
    label: "الواجبات والتكليفات",
  },
  { id: "profile", href: "/student/profile", label: "بروفايلي" },
  { id: "chat", href: "/student/chat", label: "الشات" },
  { id: "admin-chat", href: "/student/admin-chat", label: "شات الإدارة" },
] as const;

export type StudentSection = (typeof studentSections)[number]["id"];
