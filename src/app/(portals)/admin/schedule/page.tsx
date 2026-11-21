import { PortalShell } from "@/features/dashboards/portal-shell";
import { AdminSectionView } from "@/features/dashboards/admin-section-view";

export default function AdminPage() {
  return (
    <PortalShell role="admin">
      <AdminSectionView section="schedule" />
    </PortalShell>
  );
}
