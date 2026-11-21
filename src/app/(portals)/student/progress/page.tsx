import type { Metadata } from "next";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { StudentView } from "@/features/dashboards/student-view";

export const metadata: Metadata = { title: "التقدّم والنشاط — لوحة الطالب" };
export default function StudentProgressPage() {
  return (
    <PortalShell role="student">
      <StudentView section="progress" />
    </PortalShell>
  );
}
