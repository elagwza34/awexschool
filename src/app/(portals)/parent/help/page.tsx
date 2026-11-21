import type { Metadata } from "next";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { RequestForm } from "@/features/dashboards/request-form";

export const metadata: Metadata = { title: "طلبات ولي الأمر للدعم" };

export default function ParentHelpPage() {
  return (
    <PortalShell role="parent">
      <RequestForm source="parent" />
    </PortalShell>
  );
}
