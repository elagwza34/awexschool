import type { Metadata } from "next";
import { StudentView } from "@/features/dashboards/student-view";

export const metadata: Metadata = { title: "الجدول الأسبوعي — لوحة الطالب" };
export default function StudentSchedulePage() {
  return <StudentView section="schedule" />;
}
