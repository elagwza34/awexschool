import { PortalShell } from "@/features/dashboards/portal-shell";
import { MyCourses } from "@/features/catalog/my-courses";

export default function ParentCoursesPage() {
  return (
    <PortalShell role="parent">
      <MyCourses />
    </PortalShell>
  );
}
