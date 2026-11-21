import type { Metadata } from "next";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { TeacherView } from "@/features/dashboards/teacher-view";

export const metadata: Metadata = { title: "أعمال للمراجعة — لوحة المدرس" };
export default function TeacherReviewsPage() {
  return (
    <PortalShell role="teacher">
      <TeacherView section="reviews" />
    </PortalShell>
  );
}
