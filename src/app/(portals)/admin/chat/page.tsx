import { LiveChat } from "@/features/dashboards/live-chat";

export default function AdminChatPage({ searchParams }: {
  searchParams: Promise<{ contact?: string; user?: string }>;
}) {
  return <LiveChat role="admin" section="chat" searchParams={searchParams} />;
}
