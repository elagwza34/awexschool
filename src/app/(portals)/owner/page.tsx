import type { Metadata } from "next";
import { OwnerPermissions } from "@/features/dashboards/owner-permissions";
import { getAccount, getSocialLinks } from "@/features/auth/supabase-server";
import { saveSocialLinks } from "@/features/auth/account-actions";
import { socialChannels } from "@/features/auth/social-links";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "لوحة المالك | إدارة الصلاحيات" };

export default async function OwnerPage({ searchParams }: { searchParams: Promise<{ social?: string }> }) {
  const account = await getAccount();
  if (!account?.roles.includes("owner")) redirect("/account");
  const [links, { social }] = await Promise.all([getSocialLinks(), searchParams]);
  return (
    <>
      <OwnerPermissions />
      <section id="social-links" className="container-shell scroll-mt-24 pb-10" aria-labelledby="social-title">
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
    </>
  );
}
