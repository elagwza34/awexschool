import { PortalShell } from "@/features/dashboards/portal-shell";
import { ManagementHeader } from "@/features/dashboards/management-header";
import { AdminEnrollments } from "@/features/enrollments/workspace";

export default function EnrollmentsPage() {
  return (
    <PortalShell role="admin">
      <ManagementHeader
        role="admin"
        title="الربط والمجموعات"
        description="إسناد المقررات والمدرسين، وتنظيم مجموعات الطلاب وربط أولياء الأمور داخل المعاينة."
      />
      <AdminEnrollments />
    </PortalShell>
  );
}
