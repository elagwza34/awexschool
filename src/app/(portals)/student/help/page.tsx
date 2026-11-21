import type { Metadata } from "next";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { RequestForm } from "@/features/dashboards/request-form";

export const metadata: Metadata = { title: "طلبات الطالب للدعم" };

export default function StudentHelpPage() {
  return (
    <PortalShell role="student">
      <RequestForm source="student" />
    </PortalShell>
  );
}
