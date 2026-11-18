import type { Metadata } from "next";
import { StudentView } from "@/features/dashboards/student-view";

export const metadata: Metadata = { title: "التقدّم والنشاط — لوحة الطالب" };
export default function StudentProgressPage() {
  return <StudentView section="progress" />;
}
