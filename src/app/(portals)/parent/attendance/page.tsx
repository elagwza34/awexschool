import { PortalShell } from "@/features/dashboards/portal-shell";
import { ParentAttendance } from "@/features/sessions/parent-attendance";

export default function AttendancePage() {
  return (
    <PortalShell role="parent">
      <ParentAttendance />
    </PortalShell>
  );
}
