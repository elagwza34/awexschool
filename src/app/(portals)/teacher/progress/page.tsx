import type { Metadata } from "next";
import { TeacherView } from "@/features/dashboards/teacher-view";
export const metadata: Metadata = { title: "التقدّم والنشاط — لوحة المدرس" };
export default function TeacherProgressPage() {
  return <TeacherView section="progress" />;
}
