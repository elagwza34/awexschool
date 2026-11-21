import { PortalShell } from "@/features/dashboards/portal-shell";
import { ManagementHeader } from "@/features/dashboards/management-header";
import { SessionRecords } from "@/features/sessions/views";

export default function AttendancePage() {
  return (
    <PortalShell role="teacher">
      <ManagementHeader
        role="teacher"
        title="الحضور والغياب"
        description="سجّل حضور طلاب كل حصة: حاضر أو غائب أو متأخر. الحفظ محلي فقط."
      />
      <SessionRecords role="teacher" />
    </PortalShell>
  );
}
