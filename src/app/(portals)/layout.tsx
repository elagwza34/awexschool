import type { ReactNode } from "react";
import { LivePortalNavigation } from "@/components/layout/live-portal-navigation";
import { getAccount } from "@/features/auth/supabase-server";
import { PortalPreviewProvider } from "@/features/dashboards/preview-context";
import { AssignmentProvider } from "@/features/assignments/context";
import { ContentProvider } from "@/features/content/context";

export const dynamic = "force-dynamic";

export default async function PortalsLayout({ children }: { children: ReactNode }) {
  const account = await getAccount();
  return (
    <PortalPreviewProvider>
      <AssignmentProvider>
        <ContentProvider>
          {account && <LivePortalNavigation name={account.name} roles={account.roles} />}
          {children}
        </ContentProvider>
      </AssignmentProvider>
    </PortalPreviewProvider>
  );
}
