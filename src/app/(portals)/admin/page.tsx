import type { Metadata } from "next";
import { DashboardView } from "@/features/dashboards/dashboard-view";

export const metadata: Metadata = { title: "لوحة الإدارة — معاينة" };
export default function AdminPage() {
  return <DashboardView role="admin" />;
}
