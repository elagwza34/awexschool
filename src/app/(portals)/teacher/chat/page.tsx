import type { Metadata } from "next";
import { ManagementHeader } from "@/features/dashboards/management-header";
import { ChatWorkspace } from "@/features/dashboards/chat-workspace";

export const metadata: Metadata = { title: "شات الطلاب — لوحة المدرس" };
export default function TeacherChatPage() {
  return (
    <div>
      <ManagementHeader
        role="teacher"
        title="شات الطلاب"
        description="مساحة لأسئلة الطلاب المرتبطين بمقرراتك فقط. التبادل في هذه المعاينة محلي ومؤقت، بدون إرسال خارجي."
      />
      <ChatWorkspace role="teacher" />
    </div>
  );
}
