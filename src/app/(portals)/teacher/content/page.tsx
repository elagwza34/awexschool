import { PortalShell } from "@/features/dashboards/portal-shell";
import { ContentWorkspace } from "@/features/content/workspace";

export default function Page() {
  return (
    <PortalShell role="teacher">
      <ContentWorkspace role="teacher" />
    </PortalShell>
  );
}
