import { PortalShell } from "@/features/dashboards/portal-shell";
import { ManagementHeader } from "@/features/dashboards/management-header";
import { TeamManagement } from "@/features/dashboards/team-management";

export default function AdminTeamPage() {
  return (
    <PortalShell role="admin">
      <ManagementHeader
        role="admin"
        title="فريق الإدارة"
        description="إضافة أعضاء بأدوار مدير ودعم فني ضمن المعاينة فقط."
      />
      <TeamManagement editable />
    </PortalShell>
  );
}
