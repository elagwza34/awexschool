import type { Metadata } from "next";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { StudentHeading } from "@/features/dashboards/student-heading";
import { StudentProfileEditor } from "@/features/dashboards/student-profile-editor";

export const metadata: Metadata = { title: "بروفايلي — لوحة الطالب" };
export default function StudentProfilePage() {
  return (
    <PortalShell role="student">
      <div className="space-y-4">
        <StudentHeading
          title="بروفايلي"
          description="بياناتك الشخصية والدراسية في مساحة واحدة. عدّل نموذج البروفايل وشوف شكله في المعاينة."
        />
        <StudentProfileEditor />
      </div>
    </PortalShell>
  );
}
