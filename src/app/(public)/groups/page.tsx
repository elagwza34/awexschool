import type { Metadata } from "next";
import { PublicGroups } from "@/features/enrollments/public-groups";

export const metadata: Metadata = { title: "المجموعات الدراسية" };

export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ join?: string | string[] }> }) {
  const { join } = await searchParams;
  return (
    <div className="container-shell space-y-5 py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">المجموعات الدراسية</h1>
      <p className="text-sm leading-7 text-muted-foreground">اختار مجموعة تناسب صفك ومواعيدك. كل المواعيد بتوقيت القاهرة.</p>
      <PublicGroups initialGroup={typeof join === "string" ? join : undefined} />
    </div>
  );
}
