import type { Metadata } from "next";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { StudentView } from "@/features/dashboards/student-view";

export const metadata: Metadata = { title: "الجدول الأسبوعي — لوحة الطالب" };
export default function StudentSchedulePage() {
  return (
    <PortalShell role="student">
      <StudentView section="schedule" />
    </PortalShell>
  );
}
