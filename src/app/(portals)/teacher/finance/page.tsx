import type { Metadata } from "next";
import { TeacherFinance } from "@/features/finance/workspace";

export const metadata: Metadata = { title: "مستحقاتي" };

export default function TeacherFinancePage() {
  return <TeacherFinance role="teacher" />;
}
