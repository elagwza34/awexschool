import type { Metadata } from "next";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { ManagementHeader } from "@/features/dashboards/management-header";
import { AdminUsersWorkspace } from "@/features/dashboards/admin-users-workspace";

export const metadata: Metadata = { title: "إدارة المستخدمين والأدوار" };
export default function AdminUsersPage() {
  return (
    <PortalShell role="admin">
      <ManagementHeader
        role="admin"
        title="المستخدمون والأدوار"
        description="إدارة المستخدمين في مساحة مستقلة عن المحتوى، مع تابات للطالب وولي الأمر والمدرس والإدارة، وبحث مستقل داخل كل دور."
      />
      <AdminUsersWorkspace />
    </PortalShell>
  );
}
