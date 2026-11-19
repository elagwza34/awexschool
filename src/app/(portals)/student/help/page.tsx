import type { Metadata } from "next";
import { RequestForm } from "@/features/dashboards/request-form";

export const metadata: Metadata = { title: "طلبات الطالب للدعم" };

export default function StudentHelpPage() {
  return <RequestForm source="student" />;
}
