import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalMetrics } from "@/components/layout/portal-metrics";
import { getAccount } from "@/features/auth/supabase-server";
import { isPreviewFixtureEnvironment } from "@/lib/environment";
import { getCourseEnrollments } from "./enrollment-actions";
import { listPublishedCourses } from "./live-catalog";
import { getMockCourses, getMockEnrollments } from "./portal-fixtures";

export async function MyCourses({ role, overview = false }: { role: "student" | "parent"; overview?: boolean }) {
  const account = await getAccount();
  if (!account) redirect("/login");
  if (!account.roles.includes(role)) redirect("/account?message=portal-denied");
  const [requestsResult, coursesResult] = await Promise.all([getCourseEnrollments(), listPublishedCourses()]);
  const preview = isPreviewFixtureEnvironment();
  const showPreviewNotice = preview && (requestsResult.state === "error" || coursesResult.state === "error");
  const requests = requestsResult.state === "ready" ? requestsResult.data : preview ? getMockEnrollments() : [];
  const courses = coursesResult.state === "ready" ? coursesResult.data : preview ? getMockCourses() : [];
  const titles = new Map(courses.map(({ id, title }) => [id, title]));
  return <main id="main-content" className="dashboard-width space-y-4 pt-5 pb-10">
    <h1 className="text-2xl font-bold">مقرراتي</h1>
    {requestsResult.state === "error" && <p role="alert" className="soft-card p-4 text-destructive">تعذّر تحميل طلبات الالتحاق.</p>}
    {coursesResult.state === "error" && <p role="alert" className="soft-card p-4 text-destructive">تعذّر تحميل بيانات المقررات.</p>}
    {showPreviewNotice && <p role="status" className="soft-card p-4">بيانات تجريبية للمعاينة فقط.</p>}
    {overview && <PortalMetrics items={[
      { label: "التحاقات مؤكدة", value: requestsResult.state === "ready" || (preview && requestsResult.state === "error") ? requests.filter(({ status }) => status === "active").length : null },
      { label: "قيد المراجعة", value: requestsResult.state === "ready" || (preview && requestsResult.state === "error") ? requests.filter(({ status }) => status === "pending").length : null },
      { label: "الطلبات المرفوضة", value: requestsResult.state === "ready" || (preview && requestsResult.state === "error") ? requests.filter(({ status }) => status === "declined").length : null },
    ]} />}
    <Link href="/courses" className="inline-flex min-h-11 items-center font-semibold text-primary underline">تصفّح المقررات</Link>
    {requests.length ? <ul className="grid gap-3">{requests.map((request) => {
      const learnerName = "student" in request ? request.student?.display_name ?? request.learner_name : request.learner_name;
      const learnerKey = "requester_id" in request ? request.requester_id ?? request.student_id ?? "legacy" : request.id;
      return <li key={`${learnerKey}-${request.course_id}`} className="soft-card p-4">
        {titles.has(request.course_id) && <Link href={`/courses/${request.course_id}`} className="font-bold text-primary underline">{titles.get(request.course_id)}</Link>}
        <p>{learnerName} · {request.status === "active" ? "التحاق مؤكد" : request.status === "declined" ? "الطلب مرفوض" : "قيد المراجعة"}</p>
      </li>;
    })}</ul> : requestsResult.state === "ready" && <p className="text-muted-foreground">لسه ما سجلتش في أي مقرر.</p>}
  </main>;
}
