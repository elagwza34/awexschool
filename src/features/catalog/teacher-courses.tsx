import Link from "next/link";
import { redirect } from "next/navigation";
import { LiveTeacherPhoto } from "@/components/live-teacher-photo";
import { PortalMetrics } from "@/components/layout/portal-metrics";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";

export async function TeacherCourses({ overview = false }: { overview?: boolean }) {
  const account = await getAccount();
  const client = ownerClient();
  if (!account?.roles.includes("teacher") || !client) redirect("/account");

  const [{ data: profile }, { data: courses }] = await Promise.all([
    client.from("teacher_profiles").select("full_name,qualification,portrait_path")
      .eq("user_id", account.user.id).maybeSingle(),
    client.from("courses").select("id,title,description").eq("teacher_id", account.user.id)
      .eq("status", "published").order("title"),
  ]);
  const CourseListHeading = overview ? "h2" : "h1";
  const name = profile?.full_name ?? account.name;
  const courseIds = courses?.map(({ id }) => id) ?? [];
  const enrollmentCounts = overview && courseIds.length ? await Promise.all(["active", "pending"].map(async (status) => {
    const result = await client.from("course_enrollments").select("course_id", { count: "exact", head: true })
      .in("course_id", courseIds).eq("status", status);
    return result.count;
  })) : [0, 0];

  return <main id="main-content" className="container-shell space-y-6 pt-5 pb-10">
    {overview && <div className="soft-card flex items-center gap-4 p-5">
      <LiveTeacherPhoto name={name} path={profile?.portrait_path ?? null} />
      <div>
        <h1 className="text-2xl font-bold">{name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{profile?.qualification}</p>
      </div>
    </div>}
    {overview && <PortalMetrics items={[
      { label: "مقررات منشورة", value: courses?.length ?? null },
      { label: "التحاقات مؤكدة", value: enrollmentCounts[0] },
      { label: "طلبات قيد المراجعة", value: enrollmentCounts[1] },
    ]} />}
    <section className="space-y-3" aria-labelledby="teacher-courses">
      <CourseListHeading id="teacher-courses" className="text-xl font-bold">مقرراتي</CourseListHeading>
      {courses?.length ? <ul className="grid gap-3 sm:grid-cols-2">{courses.map((course) => (
        <li key={course.id} className="soft-card p-4">
          <Link href={`/courses/${course.id}`} className="inline-flex min-h-11 items-center font-semibold text-primary underline">{course.title}</Link>
          <p className="text-sm leading-7 text-muted-foreground">{course.description}</p>
        </li>
      ))}</ul> : <p className="text-muted-foreground">مفيش مقررات مسندة لحسابك حاليًا.</p>}
    </section>
  </main>;
}
