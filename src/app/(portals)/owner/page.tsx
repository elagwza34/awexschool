import type { Metadata } from "next";
import Link from "next/link";
import { getSocialLinks } from "@/features/auth/supabase-server";
import { saveSocialLinks } from "@/features/auth/account-actions";
import { socialChannels } from "@/features/auth/social-links";
import { Button } from "@/components/ui/button";
import { PortalShell } from "@/features/dashboards/portal-shell";

export const metadata: Metadata = { title: "لوحة المالك | إدارة الصلاحيات" };

export default async function OwnerPage({
  searchParams,
}: {
  searchParams: Promise<{ social?: string }>;
}) {
  const [links, { social }] = await Promise.all([
    getSocialLinks(),
    searchParams,
  ]);
  return (
    <PortalShell role="owner">
      <main id="main-content" className="container-shell space-y-5 pt-28 pb-10">
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
    </PortalShell>
  );
}
