import { PortalShell } from "@/features/dashboards/portal-shell";
import { ContentWorkspace } from "@/features/content/workspace";

export default function Page() {
  return (
    <PortalShell role="admin">
      <ContentWorkspace role="admin" />
    </PortalShell>
  );
}
