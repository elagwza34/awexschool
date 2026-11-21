import { PortalShell } from "@/features/dashboards/portal-shell";
import { ManagementHeader } from "@/features/dashboards/management-header";
import { TeacherGroups } from "@/features/enrollments/workspace";

export default function GroupsPage() {
  return (
    <PortalShell role="teacher">
      <ManagementHeader
        role="teacher"
        title="مجموعاتي وطلابي"
        description="المجموعات والمقررات المسندة وقوائم طلابك."
      />
      <TeacherGroups />
    </PortalShell>
  );
}
