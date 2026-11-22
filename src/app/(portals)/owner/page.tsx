import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalMetrics } from "@/components/layout/portal-metrics";
import { Button } from "@/components/ui/button";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";

export const metadata = { title: "لوحة المالك" };

export default async function OwnerPage({ searchParams }: { searchParams: Promise<{ social?: string; role?: string }> }) {
  const account = await getAccount();
  if (!account?.roles.includes("owner")) redirect("/account");
  const { social, role } = await searchParams;
  if (social) redirect(`/owner/settings?social=${encodeURIComponent(social)}#social-links`);
  if (role) redirect(`/owner/permissions?role=${encodeURIComponent(role)}`);

  const client = ownerClient();
  const [courses, teachers, users, enrollments, applications] = await Promise.all([
    client?.from("courses").select("id", { head: true, count: "exact" }).eq("status", "published"),
    client?.from("teacher_profiles").select("user_id", { head: true, count: "exact" }),
    client?.from("profiles").select("user_id", { head: true, count: "exact" }).eq("status", "active"),
    client?.from("course_enrollments").select("course_id", { head: true, count: "exact" }).eq("status", "pending"),
    client?.from("teacher_applications").select("id", { head: true, count: "exact" }).eq("status", "pending"),
  ]);

  return (
    <main id="main-content" tabIndex={-1} className="dashboard-width space-y-5 pt-5 pb-10">
      <h1 className="text-2xl font-bold sm:text-3xl">نظرة عامة على المنصة</h1>
      <PortalMetrics items={[
        { label: "المقررات المنشورة", value: courses?.count ?? null },
        { label: "ملفات المدرسين", value: teachers?.count ?? null },
        { label: "الحسابات النشطة", value: users?.count ?? null },
        { label: "طلبات الالتحاق المعلّقة", value: enrollments?.count ?? null },
        { label: "طلبات المدرسين المعلّقة", value: applications?.count ?? null },
      ]} />
      <Button variant="outline" asChild><Link href="/owner/settings">إعدادات المنصة</Link></Button>
    </main>
  );
}
