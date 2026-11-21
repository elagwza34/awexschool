"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { dashboardLinks, dashboardRoles, type DashboardRole } from "@/features/auth/dashboard-roles";

const actions: Partial<Record<DashboardRole, readonly { title: string; items: readonly string[] }[]>> = {
  owner: [
    { title: "إجراءات المستخدمين", items: ["إضافة مستخدم", "حذف مستخدم", "قبول أو رفض طلبات المدرسين"] },
    { title: "إجراءات المحتوى والمناهج", items: ["نشر مقرر جديد", "مراجعة طلبات الالتحاق"] },
    { title: "إعدادات المنصة", items: ["تعديل روابط التواصل الاجتماعي"] },
  ],
  admin: [
    { title: "إجراءات المستخدمين", items: ["قبول أو رفض طلبات المدرسين"] },
    { title: "إجراءات المحتوى والمناهج", items: ["نشر مقرر جديد", "مراجعة طلبات الالتحاق"] },
  ],
  teacher: [{ title: "إجراءات الواجبات", items: ["إنشاء واجب", "تصحيح واجب"] }],
  student: [{ title: "إجراءات الواجبات", items: ["تسليم واجب"] }],
};

export function OwnerPermissions({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<DashboardRole>("admin");
  const access = [...dashboardLinks(role), { href: `/account?portal=${role}`, label: "حسابي" }];
  if (role === "owner") {
    access.push(
      { href: "#social-links", label: "روابط التواصل الاجتماعي" },
      { href: "/admin/site-locks", label: "أقفال الموقع" },
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="dashboard-width space-y-6 pt-5 pb-8">
      <header className="space-y-2">
        <p className="text-sm font-bold text-primary">لوحة المالك</p>
        <h1 className="text-2xl font-bold sm:text-3xl">إدارة صلاحيات الأدوار</h1>
        <p className="text-sm leading-7 text-muted-foreground">
          اختر دورًا لعرض الأقسام والإجراءات المتاحة له. الصلاحيات الحالية محددة في النظام، ويمكنك إدارة أدوار الحسابات من صفحة الحسابات.
        </p>
      </header>
      <div className="soft-card flex flex-wrap items-end justify-between gap-4 p-4">
        <label className="grid min-w-0 flex-1 gap-2 text-sm font-bold">
          الدور
          <select className="field max-w-xs" value={role} onChange={(event) => {
            const selected = dashboardRoles.find((entry) => entry.role === event.target.value);
            if (selected) setRole(selected.role);
          }}>
            {dashboardRoles.map(({ role, label }) => <option key={role} value={role}>{label}</option>)}
          </select>
        </label>
        <Link href="/account" className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold text-primary">
          إدارة الحسابات
        </Link>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="soft-card space-y-3 p-4">
          <h2 className="text-lg font-bold">الوصول للأقسام</h2>
          <ul className="grid gap-2">
            {access.map(({ href, label }) => (
              <li key={href} className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 rounded-lg border px-3 text-sm font-semibold">
                {label}
                {role === "owner" && <Link href={href} className="inline-flex min-h-11 items-center text-primary underline underline-offset-4" aria-label={`فتح ${label}`}>فتح القسم</Link>}
              </li>
            ))}
          </ul>
        </section>
        <div className="grid gap-4">
          {actions[role]?.map(({ title, items }) => (
            <section key={title} className="soft-card space-y-3 p-4">
              <h2 className="text-lg font-bold">{title}</h2>
              <ul className="grid gap-2">
                {items.map((item) => <li key={item} className="flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold">{item}</li>)}
              </ul>
            </section>
          ))}
        </div>
      </div>
      {children}
    </main>
  );
}
