import { LiveOperationsSection } from "@/features/dashboards/live-operations-section";

import { AdminLearningGroups } from "@/features/enrollments/admin-learning-groups";

export default function Page({ searchParams }: { searchParams: Promise<{ group?: string; saved?: string }> }) {
  return (
    <LiveOperationsSection role="admin" section="group-requests">
      <AdminLearningGroups searchParams={searchParams} />
    </LiveOperationsSection>
  );
}
