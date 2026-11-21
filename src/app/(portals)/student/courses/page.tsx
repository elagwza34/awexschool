import { PortalShell } from "@/features/dashboards/portal-shell";
import { MyCourses } from "@/features/catalog/my-courses";

export default function StudentCoursesPage() {
  return (
    <PortalShell role="student">
      <MyCourses />
    </PortalShell>
  );
}
