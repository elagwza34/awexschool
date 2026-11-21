import type { Metadata } from "next";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { ManagementHeader } from "@/features/dashboards/management-header";
import { TeacherProfileEditor } from "@/features/dashboards/teacher-profile-editor";

export const metadata: Metadata = { title: "بروفايل المدرس والتخصص والمنهج" };
export default function TeacherProfilePage() {
  return (
    <PortalShell role="teacher">
      <ManagementHeader
        role="teacher"
        title="بروفايل المدرس"
        description="ملف مهني متكامل، من بيانات المدرس وأسلوب الشرح، إلى التخصص والمنهج والمراحل والصفوف الدراسية."
      />
      <TeacherProfileEditor />
    </PortalShell>
  );
}
