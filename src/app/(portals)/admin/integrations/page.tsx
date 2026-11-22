import { redirect } from "next/navigation";
import { getAccount } from "@/features/auth/supabase-server";

export const metadata = { title: "ربط Meet وZoom | لوحة المالك" };

export default async function AdminIntegrationsPage() {
  const account = await getAccount();
  if (!account?.roles.includes("owner")) redirect("/account?message=portal-denied");

  return (
    <main id="main-content" tabIndex={-1} className="dashboard-width space-y-5 pt-5 pb-10">
      <h1 className="text-2xl font-bold sm:text-3xl">ربط Meet وZoom</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {["Google Meet", "Zoom"].map((provider) => (
          <section key={provider} className="soft-card space-y-2 p-5">
            <h2 className="text-lg font-bold"><bdi>{provider}</bdi></h2>
            <p className="text-sm text-muted-foreground">الربط التلقائي غير متاح حاليًا.</p>
          </section>
        ))}
      </div>
    </main>
  );
}
