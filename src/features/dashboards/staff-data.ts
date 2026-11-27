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
    description: "متابعة طلبات الدعم الفني والشكاوى والاستفسارات في المعاينة.",
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
    tone: role.id === "manager" ? "lilac" : "blue",
    metrics: [],
  };
});
export function staffSections(role: StaffRole | "customer-service") {
  return [
    { id: "overview", href: `/${role}`, label: "نظرة عامة" },
    {
      id: "requests",
      href: `/${role}/requests`,
      label: role === "support" ? "طلبات الدعم الفني" : "متابعة الطلبات",
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
  status: RequestStatus;
  details: string;
  contactEmail?: string;
  source?: RequestSource;
  replies?: string[];
  escalated?: boolean;
}

export type RequestSource = "visitor" | "student" | "parent";
export const requestSources = { visitor: "زائر", student: "طالب", parent: "ولي أمر" } as const;

export interface RequestDraft {
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
    status: "new",
    details: "بلاغ توضيحي: تظهر شاشة فارغة عند فتح معاينة الدرس على الهاتف.",
  },
  {
    id: "TECH-102",
    title: "صعوبة عرض جدول الحصص",
    sender: "أ. أحمد حسن · مدرس",
    status: "in-progress",
    details: "بلاغ توضيحي لمراجعة عرض مواعيد الحصص على جهاز لوحي.",
  },
];
