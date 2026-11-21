"use client";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { StudentView } from "@/features/dashboards/student-view";

export default function StudentDashboardPage() {
  return (
    <PortalShell role="student">
      <StudentView section="overview" />
    </PortalShell>
  );
}
