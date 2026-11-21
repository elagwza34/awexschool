import { LiveAssignments } from "@/features/dashboards/live-assignments";

export default function Page({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  return <LiveAssignments role="student" searchParams={searchParams} />;
}
