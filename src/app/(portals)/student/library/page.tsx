import { PortalShell } from "@/features/dashboards/portal-shell";
import { StudentContentLibrary } from "@/features/content/workspace";

export default function Page() {
  return (
    <PortalShell role="student">
      <StudentContentLibrary />
    </PortalShell>
  );
}
