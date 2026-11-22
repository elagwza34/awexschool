import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveSocialLinks } from "@/features/auth/account-actions";
import { socialChannels } from "@/features/auth/social-links";
import { getAccount, getSocialLinks } from "@/features/auth/supabase-server";

export const metadata = { title: "إعدادات المنصة | لوحة المالك" };

export default async function OwnerSettings({ searchParams }: { searchParams: Promise<{ social?: string }> }) {
  const account = await getAccount();
  if (!account?.roles.includes("owner")) redirect("/account");
  const [links, { social }] = await Promise.all([getSocialLinks(), searchParams]);
  return (
    <main id="main-content" tabIndex={-1} className="dashboard-width space-y-5 pt-5 pb-10">
      <h1 className="text-2xl font-bold sm:text-3xl">إعدادات المنصة</h1>
      <Button asChild variant="outline"><Link href="/admin/site-locks">أقفال الموقع</Link></Button>
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