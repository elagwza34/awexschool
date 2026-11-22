import { LiveOperationsSection } from "@/features/dashboards/live-operations-section";
import { AdminTeachersNav } from "@/features/teachers/admin-teachers-nav";

export default function Page() {
  return <LiveOperationsSection role="admin" section="finance"><AdminTeachersNav active="finance" /></LiveOperationsSection>;
}
