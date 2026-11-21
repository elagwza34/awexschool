import type { Metadata } from "next";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { TeacherFinance } from "@/features/finance/workspace";

export const metadata: Metadata = { title: "مستحقات المدرسين" };

export default function AdminFinancePage() {
  return (
    <PortalShell role="admin">
      <TeacherFinance role="admin" />
    </PortalShell>
  );
}
