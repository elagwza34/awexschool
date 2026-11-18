import { ManagementHeader } from "./management-header";
import { DashboardCalendar } from "./dashboard-calendar";
import { adminSections, type AdminReportSection } from "./admin-navigation";

export function AdminSectionView({ section }: { section: AdminReportSection }) {
  const active = adminSections.find((item) => item.id === section)!;
  return (
    <div>
      <ManagementHeader
        role="admin"
        title={active.label}
        description="بيانات توضيحية لمعاينة لوحة الإدارة، بدون عمليات فعلية."
      />
      {section === "schedule" && <DashboardCalendar role="admin" id="schedule" />}
    </div>
  );
}
