import { LiveChat } from "@/features/dashboards/live-chat";

export default function Page({ searchParams }: { searchParams: Promise<{ thread?: string; message?: string }> }) {
  return <LiveChat role="parent" section="admin-chat" searchParams={searchParams} />;
}
