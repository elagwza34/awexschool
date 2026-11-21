import { LiveAttendance } from "@/features/dashboards/live-attendance";

export default function Page({ searchParams }: { searchParams: Promise<{ session?: string; message?: string }> }) {
  return <LiveAttendance role="parent" searchParams={searchParams} />;
}
