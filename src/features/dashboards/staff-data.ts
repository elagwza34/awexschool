import type { DashboardProfile, StaffRole } from "./types";

export const staffRoles: {
  id: StaffRole;
  label: string;
  description: string;
}[] = [
  {
    id: "manager",
    label: "مدير",
    description: "متابعة أداء الفريق والطلبات والتقارير في المعاينة.",
  },
  {
    id: "support",
    label: "دعم فني",
    description: "متابعة المشكلات التقنية وتحديث حالتها تجريبيًا.",
  },
  {
    id: "customer-service",
    label: "خدمة عملاء",
    description: "متابعة استفسارات الطلاب وأولياء الأمور تجريبيًا.",
  },
];
export function isStaffRole(role: string): role is StaffRole {
  return staffRoles.some((item) => item.id === role);
}
export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
}
export const staffMemberFixtures: StaffMember[] = [
  {
    id: "manager-preview",
    name: "محمد عادل",
    email: "manager@example.com",
    role: "manager",
  },
  {
    id: "support-preview",
    name: "نور أحمد",
    email: "support@example.com",
    role: "support",
  },
  {
    id: "service-preview",
    name: "منى حسن",
    email: "service@example.com",
    role: "customer-service",
  },
];
export const staffProfiles: DashboardProfile[] = staffRoles.map((role) => {
  const member = staffMemberFixtures.find((item) => item.role === role.id)!;
  return {
    role: role.id,
    label: `لوحة ${role.label}`,
    name: member.name,
    initials: member.name
      .split(" ")
      .map((part) => part[0])
      .join(" "),
    subtitle: "فريق الإدارة · معاينة",
    greeting: `مساحتك في ${role.label}`,
    description: role.description,
    tone:
      role.id === "manager"
        ? "lilac"
        : role.id === "support"
          ? "blue"
          : "peach",
    metrics: [],
  };
});
export function staffSections(role: StaffRole) {
  return [
    { id: "overview", href: `/${role}`, label: "نظرة عامة" },
    {
      id: "requests",
      href: `/${role}/requests`,
      label:
        role === "support"
          ? "التذاكر التقنية"
          : role === "customer-service"
            ? "استفسارات العملاء"
            : "متابعة الطلبات",
    },
    ...(role === "manager"
      ? [{ id: "team", href: "/manager/team", label: "فريق الإدارة" }]
      : []),
    { id: "activity", href: `/${role}/activity`, label: "سجل النشاط" },
  ];
}
export type RequestStatus = "new" | "in-progress" | "resolved";
export const requestStatusLabels: Record<RequestStatus, string> = {
  new: "جديد",
  "in-progress": "قيد المتابعة",
  resolved: "تم الحل",
};
export interface StaffRequest {
  id: string;
  title: string;
  sender: string;
  owner: "support" | "customer-service";
  status: RequestStatus;
  details: string;
  contactEmail?: string;
  source?: RequestSource;
  category?: RequestCategory;
}

export type RequestSource = "visitor" | "student" | "parent";
export const requestSources = { visitor: "زائر", student: "طالب", parent: "ولي أمر" } as const;
export const requestCategories = {
  technical: { label: "مشكلة تقنية · الدعم الفني", owner: "support" },
  inquiry: { label: "استفسار أو طلب · خدمة العملاء", owner: "customer-service" },
  complaint: { label: "شكوى · خدمة العملاء", owner: "customer-service" },
} as const;
export type RequestCategory = keyof typeof requestCategories;

export interface RequestDraft {
  category: RequestCategory;
  title: string;
  details: string;
  name?: string;
  email?: string;
}
export const staffRequestFixtures: StaffRequest[] = [
  {
    id: "TECH-101",
    title: "مشكلة في تشغيل معاينة الدرس",
    sender: "يوسف أحمد · طالب",
    owner: "support",
    status: "new",
    details: "بلاغ توضيحي: تظهر شاشة فارغة عند فتح معاينة الدرس على الهاتف.",
  },
  {
    id: "TECH-102",
    title: "صعوبة عرض جدول الحصص",
    sender: "أ. أحمد حسن · مدرس",
    owner: "support",
    status: "in-progress",
    details: "بلاغ توضيحي لمراجعة عرض مواعيد الحصص على جهاز لوحي.",
  },
  {
    id: "CS-201",
    title: "استفسار عن مقررات الصف الأول الإعدادي",
    sender: "أحمد محمود · ولي أمر",
    owner: "customer-service",
    status: "new",
    details: "طلب توضيحي لمعرفة المقررات المتاحة للأبناء في المعاينة.",
  },
  {
    id: "CS-202",
    title: "مساعدة في اختيار المادة",
    sender: "سلمى أحمد · طالبة",
    owner: "customer-service",
    status: "resolved",
    details: "استفسار توضيحي عن طريقة الوصول لمقررات الرياضيات.",
  },
];
