import type { Metadata } from "next";
import { TeacherView } from "@/features/dashboards/teacher-view";
export const metadata: Metadata = { title: "الجدول الأسبوعي — لوحة المدرس" };
export default function TeacherSchedulePage() {
  return <TeacherView section="schedule" />;
}
