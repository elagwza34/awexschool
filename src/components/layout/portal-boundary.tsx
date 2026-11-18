import type { ReactNode } from "react";
import { PortalShell } from "@/features/dashboards/portal-shell";

import type { DashboardRole } from "@/features/dashboards/types";
export type PortalRole = DashboardRole;

// Frontend preview boundary only. These public mock views have no authorization.
// Real route protection must be designed and reviewed before integration.
export function PortalBoundary({
  role,
  children,
}: {
  role: PortalRole;
  children: ReactNode;
}) {
  return <PortalShell role={role}>{children}</PortalShell>;
}
