import type { Metadata } from "next";
import { TeacherFinance } from "@/features/finance/workspace";

export const metadata: Metadata = { title: "مستحقات المدرسين" };

export default function AdminFinancePage() {
  return <TeacherFinance role="admin" />;
}
