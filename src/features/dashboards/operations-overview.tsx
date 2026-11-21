import { PortalMetrics } from "@/components/layout/portal-metrics";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";
import { redirect } from "next/navigation";

export async function OperationsOverview({ role }: { role: "admin" | "manager" | "support" }) {
  const account = await getAccount();
  if (!account?.roles.some((item) => item === role || item === "owner")) redirect("/account");
  const client = ownerClient();
  const support = role === "support";
  const items = support
    ? await Promise.all([
      { status: "new", label: "طلبات جديدة" },
      { status: "in-progress", label: "قيد المتابعة" },
      { status: "resolved", label: "طلبات محلولة" },
    ].map(async ({ status, label }) => {
      const result = await client?.from("support_requests").select("status", { head: true, count: "exact" }).eq("status", status);
      return { label, value: result?.count ?? null };
    }))
    : await Promise.all([
      client?.from("courses").select("id", { head: true, count: "exact" }).eq("status", "published"),
      client?.from("teacher_profiles").select("user_id", { head: true, count: "exact" }),
      client?.from("course_enrollments").select("course_id", { head: true, count: "exact" }).eq("status", "pending"),
    ]).then(([courses, teachers, requests]) => [
      { label: "المقررات المنشورة", value: courses?.count ?? null },
      { label: "المدرسون", value: teachers?.count ?? null },
      { label: "طلبات التحاق معلّقة", value: requests?.count ?? null },
    ]);

  return <main id="main-content" className="container-shell space-y-5 pt-5 pb-10">
    <h1 className="text-xl font-bold sm:text-2xl">{support ? "حالة طلبات الدعم" : "نظرة عامة على المنصة"}</h1>
    <PortalMetrics items={items} />
    {items.some(({ value }) => value === null) && <p role="status" className="text-sm text-muted-foreground">بعض الأعداد غير متاحة حاليًا.</p>}
  </main>;
}
