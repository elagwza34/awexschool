"use client";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { DashboardView } from "@/features/dashboards/dashboard-view";

export default function ParentDashboardPage() {
  return (
    <PortalShell role="parent">
      <DashboardView role="parent" section="overview" />
    </PortalShell>
  );
}
