import { notFound } from "next/navigation";
import { PortalBoundary } from "@/components/layout/portal-boundary";
import { ContentWorkspace } from "@/features/content/workspace";
import { dashboardProfiles } from "@/features/dashboards/mock-data";
import { permissionSections } from "@/features/dashboards/permissions";

export default async function DelegatedWorkspacePage({
  params,
}: { params: Promise<{ role: string; area: string }> }) {
  const { role: requestedRole, area } = await params;
  const role = dashboardProfiles.find((profile) => profile.role === requestedRole)?.role;
  if (!role || (area !== "content" && area !== "curricula") ||
    !permissionSections(role).some(({ href }) => href === `/workspace/${role}/${area}`)) {
    notFound();
  }

  return (
    <PortalBoundary role={role}>
      <ContentWorkspace role={role} curriculum={area === "curricula"} />
    </PortalBoundary>
  );
}
