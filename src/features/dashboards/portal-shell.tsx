"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Bell, ShieldCheck } from "lucide-react";
import { Badge, tones } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { dashboardProfiles, getDashboardProfile } from "./mock-data";
import type { DashboardRole } from "./types";
import { usePortalPreview } from "./preview-context";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import { isStaffRole } from "./staff-data";
import { pagePermission, permissionSections } from "./permissions";
import { usePermissions } from "./permissions-context";

export function PortalShell({
  role,
  children,
}: {
  role: DashboardRole;
  children: ReactNode;
}) {
  const { can } = usePermissions();
  const topSections = permissionSections(role).filter((section) => can(role, `page:${section.id}`));
  const baseProfile = getDashboardProfile(role);
  const { accounts } = useEnrollmentPreview();
  const previewAccount = accounts.find(
    (account) =>
      account.kind === role &&
      account.entityId ===
        (role === "teacher"
          ? "ahmed-hassan"
          : role === "student"
            ? "youssef"
            : role === "parent"
              ? "preview-parent"
              : "preview-admin"),
  );
  const { teacherProfile, studentProfile } = usePortalPreview();
  const profile =
    role === "teacher"
      ? { ...baseProfile, name: teacherProfile.displayName }
      : role === "student"
        ? {
            ...baseProfile,
            name: studentProfile.displayName,
            initials: studentProfile.displayName
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join(" "),
          }
        : baseProfile;
  const router = useRouter();
  const pathname = usePathname();
  const navigationPath = pathname.startsWith(`/${role}/learn/`)
    ? `/${role}/${role === "admin" ? "content" : "courses"}`
    : pathname;
  const topNavRef = useRef<HTMLElement>(null);
  useEffect(() => {
    topNavRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);
  return (
    <div className="min-h-screen bg-background pt-24" data-layout={role}>
      <div className="min-w-0">
        <div className="border-b bg-white">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-5 lg:px-6">
            <p className="min-w-0 text-sm font-bold sm:text-base">{profile.label}</p>
            <div className="flex items-center gap-2 sm:gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="معاينة الإشعارات"
                    className="relative"
                  >
                    <Bell />
                    <span
                      aria-hidden="true"
                      className="absolute end-2.5 top-2.5 size-1.5 rounded-full bg-[#b96d36]"
                    />
                  </Button>
                </DialogTrigger>
                <DialogContent dir="rtl">
                  <DialogHeader className="text-start">
                    <DialogTitle>إشعارات تجريبية</DialogTitle>
                    <DialogDescription className="leading-7">
                      مرحبًا بك في معاينة {profile.label}. هذه نماذج فقط؛ لا توجد
                      رسائل أو إشعارات حقيقية.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="rounded-xl border bg-secondary p-4 text-sm">
                    كل فهم جديد يستحق خطوة جديدة. استكشف الدروس والمقررات
                    النموذجية من الموقع العام.
                  </div>
                </DialogContent>
              </Dialog>
              <div className="h-7 border-e" />
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  tones[profile.tone],
                )}
              >
                {profile.initials}
              </span>
              <div className="hidden sm:block">
                <p className="text-xs font-bold">{profile.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {profile.label}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-[#f0f3f1] px-4 py-1.5 sm:px-5 lg:px-6">
          <p className="flex items-center gap-2 text-[11px] text-[#405c47]">
            <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
            معاينة واجهة فقط · بيانات افتراضية، بدون حساب أو صلاحيات فعلية
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {(role === "student" || role === "parent") && can(role, "page:help") && (
              <Link href={`/${role}/help`} className="inline-flex min-h-11 items-center px-2 text-xs font-bold text-primary underline underline-offset-4">
                قدّم شكوى أو طلب
              </Link>
            )}
            {role === "student" && can(role, "page:subscriptions") && (
              <Link href="/student/subscriptions" className="inline-flex min-h-11 items-center px-2 text-xs font-bold text-primary underline underline-offset-4">
                اشتراكاتي
              </Link>
            )}
            <label htmlFor="dashboard-role" className="text-xs font-bold">
              تبديل اللوحة
            </label>
            <select
              id="dashboard-role"
              className="min-h-10 rounded-lg border border-[#c9d7c0] bg-white px-3 text-xs font-semibold"
              value={role}
              onChange={(event) => router.push(`/${event.target.value}`)}
            >
              {dashboardProfiles.map((p) => (
                <option key={p.role} value={p.role}>
                  {p.label}
                </option>
              ))}
              <option value="owner">لوحة المالك</option>
            </select>
          </div>
        </div>
        <div className="border-b bg-white">
          <nav
            aria-label={
              role === "student"
                ? "أقسام لوحة الطالب"
                : role === "parent"
                  ? "أقسام لوحة ولي الأمر"
                  : role === "admin"
                    ? "أقسام لوحة الإدارة"
                    : isStaffRole(role)
                      ? `أقسام ${profile.label}`
                      : "أقسام لوحة المدرس"
            }
            ref={topNavRef}
            className="mx-auto max-w-[1480px] overflow-x-auto px-4 sm:px-5 lg:px-6"
          >
            <div className="flex w-max min-w-full gap-2">
              {topSections.map((section) => (
                <Link
                  key={section.id}
                  href={section.href}
                  aria-current={
                    navigationPath === section.href ||
                    (section.id !== "overview" &&
                      navigationPath.startsWith(`${section.href}/`))
                      ? "page"
                      : undefined
                  }
                  className={cn(
                    "inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-semibold transition-colors",
                    navigationPath === section.href ||
                      (section.id !== "overview" &&
                        navigationPath.startsWith(`${section.href}/`))
                      ? "border-primary text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-primary",
                  )}
                >
                  {section.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
        {previewAccount && previewAccount.status !== "نشط" && (
          <p role="status" className="border-b bg-secondary px-4 py-3 text-sm">
            حالة المستخدم: {previewAccount.status}. حالة تجريبية؛ الإسنادات
            والإرسال وإنشاء الحصص للمستخدم غير النشط متوقفة في المعاينة.
          </p>
        )}
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-[1480px] px-4 py-5 sm:px-5 lg:px-6 lg:py-6"
        >
          {can(role, pagePermission(role, pathname)) ? children : (
            <section className="soft-card space-y-3 p-6">
              <h1 className="text-xl font-bold">الصلاحية غير متاحة</h1>
              <p className="text-sm leading-7 text-muted-foreground">الدور الحالي لا يملك صلاحية فتح هذا القسم في المعاينة. اختار قسمًا متاحًا أو راجع إعدادات الدور.</p>
              <div className="flex flex-wrap gap-3">
                {topSections[0] && <Button asChild><Link href={topSections[0].href}>افتح قسمًا متاحًا</Link></Button>}
                <Button asChild variant="outline"><Link href="/owner">راجع صلاحيات الدور</Link></Button>
              </div>
            </section>
          )}
        </main>
        <footer className="flex flex-wrap justify-between gap-3 border-t px-4 py-4 text-[11px] text-muted-foreground sm:px-6">
          <span>
            <bdi>liveschool</bdi> · رحلة تعلّم تبدأ بالفهم
          </span>
          <Badge className="text-[10px]">عرض تجريبي · حفظ مؤقت فقط</Badge>
        </footer>
      </div>
    </div>
  );
}
