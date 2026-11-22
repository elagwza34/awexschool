import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalMetrics } from "@/components/layout/portal-metrics";
import { getAccount } from "@/features/auth/supabase-server";
import { getCourseEnrollments } from "./enrollment-actions";
import { listPublishedCourses } from "./live-catalog";

export async function MyCourses({ role, overview = false }: { role: "student" | "parent"; overview?: boolean }) {
  const account = await getAccount();
  if (!account) redirect("/login");
  if (!account.roles.includes(role)) redirect("/account?message=portal-denied");
  const [requests, courses] = await Promise.all([getCourseEnrollments(), listPublishedCourses()]);
  const titles = new Map(courses.map(({ id, title }) => [id, title]));
  return <main id="main-content" className="dashboard-width space-y-4 pt-5 pb-10">
    <h1 className="text-2xl font-bold">مقرراتي</h1>
    {overview && <PortalMetrics items={[
      { label: "التحاقات مؤكدة", value: requests.filter(({ status }) => status === "active").length },
      { label: "قيد المراجعة", value: requests.filter(({ status }) => status === "pending").length },
      { label: "الطلبات المرفوضة", value: requests.filter(({ status }) => status === "declined").length },
    ]} />}
    <Link href="/courses" className="inline-flex min-h-11 items-center font-semibold text-primary underline">تصفّح المقررات</Link>
    {requests.length ? <ul className="grid gap-3">{requests.map(({ course_id, learner_name, status }) => (
      <li key={course_id} className="soft-card p-4">
        {titles.has(course_id) && <Link href={`/courses/${course_id}`} className="font-bold text-primary underline">{titles.get(course_id)}</Link>}
        <p>{learner_name} · {status === "active" ? "التحاق مؤكد" : status === "declined" ? "الطلب مرفوض" : "قيد المراجعة"}</p>
      </li>
    ))}</ul> : <p className="text-muted-foreground">لسه ما سجلتش في أي مقرر.</p>}
  </main>;
}
