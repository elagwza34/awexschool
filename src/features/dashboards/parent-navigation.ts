export const parentSections = [
  { id: "overview", href: "/parent", label: "نظرة عامة" },
  { id: "courses", href: "/parent/courses", label: "مقررات الأبناء" },
  { id: "progress", href: "/parent/progress", label: "التقدّم والنشاط" },
  { id: "schedule", href: "/parent/schedule", label: "الجدول الأسبوعي" },
  { id: "attendance", href: "/parent/attendance", label: "الحضور والغياب" },
  {
    id: "assignments",
    href: "/parent/assignments",
    label: "الواجبات والتكليفات",
  },
  { id: "admin-chat", href: "/parent/admin-chat", label: "شات الإدارة" },
] as const;

export type ParentSection = (typeof parentSections)[number]["id"];
