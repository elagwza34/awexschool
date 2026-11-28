import { LiveProgress } from "@/features/dashboards/live-progress";

export const metadata = { title: "التقدّم والنشاط" };

export default function Page() {
  return <LiveProgress role="teacher" />;
}
