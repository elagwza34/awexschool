import type { Metadata } from "next";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { AssignmentsWorkspace } from "@/features/assignments/workspace";

export const metadata: Metadata = { title: "الواجبات والتكليفات — لوحة الطالب" };
export default function Page() {
  return (
    <PortalShell role="student">
      <AssignmentsWorkspace role="student" />
    </PortalShell>
  );
}
