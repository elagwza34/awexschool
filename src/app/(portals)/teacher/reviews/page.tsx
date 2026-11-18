import type { Metadata } from "next";
import { TeacherView } from "@/features/dashboards/teacher-view";
export const metadata: Metadata = { title: "أعمال للمراجعة — لوحة المدرس" };
export default function TeacherReviewsPage() {
  return <TeacherView section="reviews" />;
}
