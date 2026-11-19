"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { dashboardProfiles } from "./mock-data";
import { usePermissions } from "./permissions-context";
import { contentPermissions, permissionSections, type ContentPermission, type Permission } from "./permissions";
import type { DashboardRole } from "./types";

export function OwnerPermissions() {
  const { can, setPermission, resetRole } = usePermissions();
  const [role, setRole] = useState<DashboardRole>("admin");
  const [message, setMessage] = useState("");
  const access = permissionSections(role).map(({ id, label, href }) => ({
    permission: `page:${id}` as const, label, href,
  }));
  const actions = (Object.keys(contentPermissions) as ContentPermission[]).map((action) => ({
    permission: `content:${action}` as const, label: contentPermissions[action],
  }));

  function renderPermission({ permission, label, href }: { permission: Permission; label: string; href?: string }) {
    return (
      <li key={permission} className="flex flex-wrap items-center justify-between gap-x-4 rounded-lg border px-3">
        <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3 text-sm font-semibold">
          <input
            className="size-5 shrink-0 accent-primary"
            type="checkbox"
            checked={can(role, permission)}
            onChange={(event) => {
              const allowed = event.target.checked;
              setPermission(role, permission, allowed);
              setMessage(allowed ? `تم منح صلاحية ${label}.` : `تم سحب صلاحية ${label}.`);
            }}
          />
          {label}
        </label>
        {href && (
          <Link href={href} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4" aria-label={`اختبار الوصول إلى ${label}`}>
            اختبار الوصول
          </Link>
        )}
      </li>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="container-shell space-y-6 pt-28 pb-8">
      <header className="space-y-2">
        <p className="text-sm font-bold text-primary">لوحة المالك</p>
        <h1 className="text-2xl font-bold sm:text-3xl">إدارة صلاحيات الأدوار</h1>
        <p className="text-sm leading-7 text-muted-foreground">
          التعديلات فورية ومحفوظة خلال جلسة تبويب المعاينة. الوصول للوحة المالك متاح لأي زائر في هذه النسخة التجريبية.
        </p>
      </header>
      <div className="soft-card flex flex-wrap items-end justify-between gap-4 p-4">
        <label className="grid flex-1 gap-2 text-sm font-bold">
          الدور
          <select className="field max-w-xs" value={role} onChange={(event) => {
            setRole(event.target.value as DashboardRole);
            setMessage("");
          }}>
            {dashboardProfiles.map((profile) => <option key={profile.role} value={profile.role}>{profile.label}</option>)}
          </select>
        </label>
        <Button variant="outline" onClick={() => {
          resetRole(role);
          setMessage("تمت استعادة الصلاحيات الافتراضية للدور.");
        }}>
          استعادة الافتراضي
        </Button>
      </div>
      <p role="status" className="sr-only">{message}</p>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="soft-card space-y-3 p-4">
          <h2 className="text-lg font-bold">الوصول للأقسام</h2>
          <ul className="grid gap-2">{access.map(renderPermission)}</ul>
        </section>
        <section className="soft-card space-y-3 p-4">
          <h2 className="text-lg font-bold">إجراءات المحتوى والمناهج</h2>
          <p className="text-sm leading-7 text-muted-foreground">الإجراءات تحتاج صلاحية الدخول لإدارة المحتوى أو المناهج.</p>
          <ul className="grid gap-2">{actions.map(renderPermission)}</ul>
        </section>
      </div>
    </main>
  );
}
