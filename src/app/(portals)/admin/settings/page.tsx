import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveSocialLinks } from "@/features/auth/account-actions";
import { getAccount, getSocialLinks } from "@/features/auth/supabase-server";
import { SocialLinksSettings } from "@/features/auth/social-links-settings";

export const metadata = { title: "إعدادات المنصة | لوحة الإدارة" };

export default async function AdminSettings({ searchParams }: { searchParams: Promise<{ social?: string }> }) {
  const account = await getAccount();
  if (!account?.roles.includes("owner")) redirect("/account");
  const [links, { social }] = await Promise.all([getSocialLinks(), searchParams]);
  return (
    <main id="main-content" tabIndex={-1} className="dashboard-width space-y-5 pt-5 pb-10">
      <h1 className="text-2xl font-bold sm:text-3xl">إعدادات المنصة</h1>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link href="/admin/site-locks">أقفال الموقع</Link></Button>
        <Button asChild variant="outline"><Link href="/admin/integrations">ربط Meet وZoom</Link></Button>
      </div>
      <SocialLinksSettings action={saveSocialLinks} links={links} message={social} />
    </main>
  );
}
