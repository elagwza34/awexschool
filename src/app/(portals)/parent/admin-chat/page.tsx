import { PortalShell } from "@/features/dashboards/portal-shell";
import { ChatWorkspace } from "@/features/dashboards/chat-workspace";

export default function AdministrationChatPage() {
  return (
    <PortalShell role="parent">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">شات الإدارة</h1>
        <ChatWorkspace role="parent" administration />
      </div>
    </PortalShell>
  );
}
