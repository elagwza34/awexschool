import { PortalShell } from "@/features/dashboards/portal-shell";
import { DashboardView } from "@/features/dashboards/dashboard-view";

export default function ParentSectionPage() {
  return (
    <PortalShell role="parent">
      <DashboardView role="parent" section="schedule" />
    </PortalShell>
  );
}
