import { notFound } from "next/navigation";
import { PortalBoundary } from "@/components/layout/portal-boundary";
import { ContentWorkspace } from "@/features/content/workspace";
import { AdminUsersWorkspace } from "@/features/dashboards/admin-users-workspace";
import { dashboardProfiles } from "@/features/dashboards/mock-data";
import { permissionSections } from "@/features/dashboards/permissions";
import { GroupChatWorkspace } from "@/features/chat/group-workspace";
import { GroupRequestsWorkspace } from "@/features/enrollments/join-requests";

export default async function DelegatedWorkspacePage({
  params,
  searchParams,
}: { params: Promise<{ role: string; area: string }>; searchParams: Promise<{ group?: string | string[] }> }) {
  const { role: requestedRole, area } = await params;
  const role = dashboardProfiles.find((profile) => profile.role === requestedRole)?.role;
  if (!role || (area !== "content" && area !== "curricula" && area !== "users" && area !== "group-chat" && area !== "group-requests") ||
    !permissionSections(role).some(({ href }) => href === `/workspace/${role}/${area}`)) {
    notFound();
  }
  const { group } = area === "group-chat" ? await searchParams : {};

  return (
    <PortalBoundary role={role}>
      {area === "group-requests" ? <GroupRequestsWorkspace role={role} /> : area === "group-chat" ? (
        <GroupChatWorkspace role={role} groupId={typeof group === "string" ? group : undefined} />
      ) : area === "users" ? (
        <>
          <h1 className="mb-4 text-2xl font-bold sm:text-3xl">المستخدمون والأدوار</h1>
          <AdminUsersWorkspace actor={role} />
        </>
      ) : <ContentWorkspace role={role} curriculum={area === "curricula"} />}
    </PortalBoundary>
  );
}
