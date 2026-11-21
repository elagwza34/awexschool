import type { Metadata } from "next";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { ManagementHeader } from "@/features/dashboards/management-header";
import { TeacherSessions } from "@/features/dashboards/teacher-sessions";

export const metadata: Metadata = {
  title: "إنشاء الحصص والاجتماعات التجريبية",
};
export default function TeacherSessionsPage() {
  return (
    <PortalShell role="teacher">
      <ManagementHeader
        role="teacher"
        title="الحصص والاجتماعات"
        description="جهّز الحصة على مقرر مسند، وحدد موعدها ومنصة الاجتماع. إعدادات الإدارة تتحكم في إنشاء نموذج اجتماع تلقائيًا."
      />
      <TeacherSessions />
    </PortalShell>
  );
}
