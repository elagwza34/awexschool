import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { PortalMetrics } from "@/components/layout/portal-metrics";
import { Button } from "@/components/ui/button";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";

export const metadata = { title: "لوحة الإدارة" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ social?: string; role?: string }> }) {
  const account = await getAccount();
  if (!account?.roles.some((role) => role === "admin" || role === "owner")) redirect("/account");
  const canManagePlatform = account.roles.includes("owner");
  const { social, role } = await searchParams;
  if (social) redirect(`/admin/settings?social=${encodeURIComponent(social)}#social-links`);
  if (role) redirect(`/admin/permissions?role=${encodeURIComponent(role)}`);

  const client = ownerClient();
  const [courses, teachers, users, enrollments, applications] = await Promise.all([
    client?.from("courses").select("id", { head: true, count: "exact" }).eq("status", "published"),
    client?.from("teacher_profiles").select("user_id", { head: true, count: "exact" }),
    client?.from("profiles").select("user_id", { head: true, count: "exact" }).eq("status", "active"),
    client?.from("course_enrollments").select("course_id", { head: true, count: "exact" }).eq("status", "pending"),
    client?.from("teacher_applications").select("id", { head: true, count: "exact" }).eq("status", "pending"),
  ]);
  const queues = [
    { label: "طلبات الالتحاق", count: enrollments?.count, href: "/admin/catalog?tab=enrollments" },
    { label: "طلبات المدرسين", count: applications?.count, href: "/admin/teacher-applications?filter=pending" },
  ];

  return (
    <main id="main-content" tabIndex={-1} className="dashboard-width space-y-5 pt-5 pb-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">نظرة عامة على المنصة</h1>
        {canManagePlatform && <Button variant="outline" className="min-h-11" asChild>
          <Link href="/admin/settings"><Settings aria-hidden="true" /> إعدادات المنصة</Link>
        </Button>}
      </header>
      <section className="space-y-3" aria-labelledby="admin-review-title">
        <h2 id="admin-review-title" className="text-lg font-bold">طلبات قيد المراجعة</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {queues.map(({ label, count, href }) => (
            <li key={href}>
              <Link href={href} className="soft-card flex min-h-20 items-center justify-between gap-3 p-4 hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2">
                <span className="grid gap-1">
                  <span className="font-bold">{label}</span>
                  <span className="text-sm text-muted-foreground">
                    {count == null ? "العدد غير متاح حاليًا" : `عدد الطلبات المعلّقة ${count.toLocaleString("ar-EG")}`}
                  </span>
                </span>
                <ArrowLeft className="size-4 shrink-0 text-primary" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-3" aria-labelledby="admin-stats-title">
        <h2 id="admin-stats-title" className="text-lg font-bold">إحصائيات المنصة</h2>
        <PortalMetrics items={[
          { label: "المقررات المنشورة", value: courses?.count ?? null },
          { label: "ملفات المدرسين", value: teachers?.count ?? null },
          { label: "الحسابات النشطة", value: users?.count ?? null },
        ]} />
      </section>
    </main>
  );
}
