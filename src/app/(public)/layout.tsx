import { SiteFooter } from "@/components/layout/site-footer";
import { redirect } from "next/navigation";
import { isDemoEnabled } from "@/features/auth/supabase-server";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isDemoEnabled())) redirect("/account");
  return (
    <div className="flex min-h-screen flex-col">
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 pt-20">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
