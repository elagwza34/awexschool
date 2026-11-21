"use client";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { DashboardView } from "@/features/dashboards/dashboard-view";

export default function AdminDashboardPage() {
  return (
    <PortalShell role="admin">
      <DashboardView role="admin" section="overview" />
    </PortalShell>
  );
}
