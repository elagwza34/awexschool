import { LiveChat } from "@/features/dashboards/live-chat";

export default function Page({ searchParams }: { searchParams: Promise<{ contact?: string }> }) {
  return <LiveChat role="teacher" section="chat" searchParams={searchParams} />;
}
