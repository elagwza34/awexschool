import type { Metadata } from "next";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { StudentHeading } from "@/features/dashboards/student-heading";
import { ChatWorkspace } from "@/features/dashboards/chat-workspace";

export const metadata: Metadata = { title: "الشات — لوحة الطالب" };
export default function StudentChatPage() {
  return (
    <PortalShell role="student">
      <div className="space-y-4">
        <StudentHeading
          title="الشات"
          description="اسأل مدرسك عن الدرس من محادثة مرتبطة بمقرراتك. الرسائل هنا للمعاينة فقط، وليست تواصلًا حقيقيًا."
        />
        <ChatWorkspace role="student" />
      </div>
    </PortalShell>
  );
}
