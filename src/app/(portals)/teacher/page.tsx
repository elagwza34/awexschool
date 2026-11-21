"use client";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { TeacherView } from "@/features/dashboards/teacher-view";

export default function TeacherDashboardPage() {
  return (
    <PortalShell role="teacher">
      <TeacherView section="overview" />
    </PortalShell>
  );
}
