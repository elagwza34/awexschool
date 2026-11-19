import type { Metadata } from "next";
import { TeacherApplicationsWorkspace } from "@/features/teachers/applications-workspace";

export const metadata: Metadata = { title: "طلبات المدرسين" };

export default function TeacherApplicationsPage() {
  return <TeacherApplicationsWorkspace />;
}
