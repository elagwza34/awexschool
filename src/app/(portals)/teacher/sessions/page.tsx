import type { Metadata } from "next";
import { ManagementHeader } from "@/features/dashboards/management-header";
import { TeacherSessions } from "@/features/dashboards/teacher-sessions";

export const metadata: Metadata = {
  title: "إنشاء الحصص والاجتماعات التجريبية",
};
export default function TeacherSessionsPage() {
  return (
    <>
      <ManagementHeader
        role="teacher"
        title="الحصص والاجتماعات"
        description="جهّز الحصة على مقرر مسند، وحدد موعدها ومنصة الاجتماع. إعدادات الإدارة تتحكم في إنشاء نموذج اجتماع تلقائيًا."
      />
      <TeacherSessions />
    </>
  );
}
