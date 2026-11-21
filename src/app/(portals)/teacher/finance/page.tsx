import type { Metadata } from "next";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { TeacherFinance } from "@/features/finance/workspace";

export const metadata: Metadata = { title: "مستحقاتي" };

export default function TeacherFinancePage() {
  return (
    <PortalShell role="teacher">
      <TeacherFinance role="teacher" />
    </PortalShell>
  );
}
