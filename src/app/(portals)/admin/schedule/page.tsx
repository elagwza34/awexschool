import { SessionManagement } from "@/features/dashboards/session-management";
﻿import { LiveOperationsSection } from "@/features/dashboards/live-operations-section";

export default function Page() {
  return <LiveOperationsSection role="admin" section="schedule"><SessionManagement /></LiveOperationsSection>;
}
