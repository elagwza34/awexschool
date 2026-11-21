import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccount, getSocialLinks, ownerClient } from "@/features/auth/supabase-server";
import { PortalMetrics } from "@/components/layout/portal-metrics";
import { saveSocialLinks } from "@/features/auth/account-actions";
import { socialChannels } from "@/features/auth/social-links";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "لوحة المالك | إدارة الصلاحيات" };

export default async function OwnerPage({
  searchParams,
}: {
  searchParams: Promise<{ social?: string }>;
}) {
  const account = await getAccount();
  if (!account?.roles.includes("owner")) redirect("/account");
  const client = ownerClient();
  const [links, { social }, courses, teachers, users] = await Promise.all([
    getSocialLinks(),
    searchParams,
    client?.from("courses").select("id", { head: true, count: "exact" }).eq("status", "published"),
    client?.from("teacher_profiles").select("user_id", { head: true, count: "exact" }),
    client?.from("profiles").select("user_id", { head: true, count: "exact" }).eq("status", "active"),
  ]);
  return (
    <main id="main-content" className="dashboard-width space-y-5 pt-5 pb-10">
      <h1 className="text-2xl font-bold">إدارة المنصة</h1>
      <PortalMetrics items={[
        { label: "المقررات المنشورة", value: courses?.count ?? null },
        { label: "ملفات المدرسين", value: teachers?.count ?? null },
        { label: "الحسابات النشطة", value: users?.count ?? null },
      ]} />
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link href="/account">إدارة الحسابات</Link></Button>
        <Button asChild variant="outline"><Link href="/admin/catalog">إدارة المقررات</Link></Button>
        <Button asChild variant="outline"><Link href="/admin/teacher-applications">طلبات المدرسين</Link></Button>
        <Button asChild variant="outline"><Link href="/admin/site-locks">أقفال الموقع</Link></Button>
      </div>
      <section id="social-links" className="scroll-mt-24" aria-labelledby="social-title">
        <form action={saveSocialLinks} className="soft-card grid gap-4 p-5 sm:p-6">
          <h2 id="social-title" className="text-xl font-bold">روابط التواصل الاجتماعي</h2>
          {social && <p role="status" className="text-sm">
            {social === "saved" ? "تم حفظ الروابط." : social === "invalid" ? "راجع إن كل رابط HTTPS ومن المنصة الصحيحة." : "تعذّر حفظ الروابط."}
          </p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {socialChannels.map(({ id, label }) => (
              <label key={id} className="grid gap-2 text-sm font-semibold">
                {label}
                <input className="field" name={id} type="url" dir="ltr" maxLength={2048} defaultValue={links[id]} />
              </label>
            ))}
          </div>
          <Button className="justify-self-start">حفظ الروابط</Button>
        </form>
      </section>
    </main>
  );
}
