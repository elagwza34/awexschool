import type { Metadata } from "next";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { AssignmentsWorkspace } from '@/features/assignments/workspace';

export const metadata: Metadata = { title: "الواجبات والتكليفات — لوحة الإدارة" };
export default function Page() {
  return (
    <PortalShell role="admin">
      <AssignmentsWorkspace role="admin" />
    </PortalShell>
  );
}
