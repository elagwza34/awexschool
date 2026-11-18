import type { Metadata } from "next";
import { TeacherView } from "@/features/dashboards/teacher-view";
export const metadata: Metadata = { title: "مقرراتي — لوحة المدرس" };
export default function TeacherCoursesPage() {
  return <TeacherView section="courses" />;
}
