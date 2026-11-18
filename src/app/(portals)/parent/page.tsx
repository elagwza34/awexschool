import type { Metadata } from "next";
import { DashboardView } from "@/features/dashboards/dashboard-view";

export const metadata: Metadata = { title: "لوحة ولي الأمر — معاينة" };
export default function ParentPage() {
  return <DashboardView role="parent" />;
}
