import type { Metadata } from "next";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { GroupRequestsWorkspace } from "@/features/enrollments/join-requests";

export const metadata: Metadata = { title: "طلبات انضمام المجموعات" };

export default function Page() {
  return (
    <PortalShell role="admin">
      <GroupRequestsWorkspace role="admin" />
    </PortalShell>
  );
}
