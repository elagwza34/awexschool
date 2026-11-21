import type { Metadata } from "next";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { ContentWorkspace } from "@/features/content/workspace";

export const metadata: Metadata = { title: "إدارة المناهج" };

export default function CurriculaPage() {
  return (
    <PortalShell role="admin">
      <ContentWorkspace role="admin" curriculum />
    </PortalShell>
  );
}
