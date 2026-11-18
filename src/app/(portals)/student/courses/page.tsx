import type { Metadata } from "next";
import { StudentView } from "@/features/dashboards/student-view";

export const metadata: Metadata = { title: "مقرراتي — لوحة الطالب" };
export default function StudentCoursesPage() {
  return <StudentView section="courses" />;
}
