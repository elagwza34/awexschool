import type { Metadata } from "next";
import { TeacherView } from "@/features/dashboards/teacher-view";

export const metadata: Metadata = { title: "لوحة المدرس — معاينة" };
export default function TeacherPage() {
  return <TeacherView />;
}
