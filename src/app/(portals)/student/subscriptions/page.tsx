import { PortalShell } from "@/features/dashboards/portal-shell";
import { StudentSubscriptions } from "@/features/enrollments/student-subscriptions";

export const metadata = { title: "اشتراكاتي" };

export default function Page() {
  return (
    <PortalShell role="student">
      <StudentSubscriptions />
    </PortalShell>
  );
}
