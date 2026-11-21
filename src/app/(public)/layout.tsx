import { SiteFooter } from "@/components/layout/site-footer";

export const dynamic = "force-dynamic";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 pt-20">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
