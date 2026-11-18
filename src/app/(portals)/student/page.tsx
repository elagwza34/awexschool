import type { Metadata } from "next";
import { StudentView } from "@/features/dashboards/student-view";

export const metadata: Metadata = { title: "لوحة الطالب — معاينة" };
export default function StudentPage() {
  return <StudentView />;
}
