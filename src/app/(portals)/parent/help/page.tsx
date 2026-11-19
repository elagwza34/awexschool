import type { Metadata } from "next";
import { RequestForm } from "@/features/dashboards/request-form";

export const metadata: Metadata = { title: "طلبات ولي الأمر للدعم" };

export default function ParentHelpPage() {
  return <RequestForm source="parent" />;
}
