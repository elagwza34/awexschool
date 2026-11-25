import Link from "next/link";
import { redirect } from "next/navigation";
import { LiveTeacherPhoto } from "@/components/live-teacher-photo";
import { PortalMetrics } from "@/components/layout/portal-metrics";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";

export async function TeacherCourses({ overview = false }: { overview?: boolean }) {
  const account = await getAccount();
  const client = ownerClient();
  if (!account?.roles.includes("teacher") || !client) redirect("/account");

  const [profileResult, ownedCourses, groupCourses] = await Promise.all([
    client.from("teacher_profiles").select("full_name,qualification,portrait_path")
      .eq("user_id", account.user.id).maybeSingle(),
    client.from("courses").select("id,title,description").eq("teacher_id", account.user.id)
      .eq("status", "published").order("title"),
    client.from("learning_groups").select("course_id,courses!inner(id,title,description)")
      .eq("teacher_id", account.user.id).eq("active", true).eq("courses.status", "published"),
  ]);
  if (profileResult.error || ownedCourses.error || groupCourses.error) {
    return <main id="main-content" className="dashboard-width pt-5 pb-10">
      <p role="alert" className="soft-card p-5 text-destructive">تعذّر تحميل بيانات المقررات.</p>
    </main>;
  }
  const profile = profileResult.data;
  const groupCourseRows = groupCourses.data?.flatMap(({ courses: course }) => {
    const record = Array.isArray(course) ? course[0] : course;
    return record ? [record] : [];
  }) ?? [];
  const courses = [...new Map([
    ...(ownedCourses.data ?? []),
    ...groupCourseRows,
  ].map((course) => [course.id, course])).values()].sort((a, b) => a.title.localeCompare(b.title));
  const CourseListHeading = overview ? "h2" : "h1";
  const name = profile?.full_name ?? account.name;
  const courseIds = courses.map(({ id }) => id);
  const enrollmentCounts = overview && courseIds.length ? await Promise.all(["active", "pending"].map(async (status) => {
    const result = await client.from("course_enrollments").select("course_id", { count: "exact", head: true })
      .in("course_id", courseIds).eq("status", status);
    return { count: result.count, error: result.error };
  })) : [{ count: 0, error: null }, { count: 0, error: null }];

  return <main id="main-content" className="dashboard-width space-y-6 pt-5 pb-10">
    {overview && <div className="soft-card flex items-center gap-4 p-5">
      <LiveTeacherPhoto name={name} path={profile?.portrait_path ?? null} />
      <div>
        <h1 className="text-2xl font-bold">{name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{profile?.qualification}</p>
      </div>
    </div>}
    {enrollmentCounts.some(({ error }) => error) && <p role="alert" className="soft-card p-4 text-destructive">تعذّر تحميل عدد التحاقات المقررات.</p>}
    {overview && <PortalMetrics items={[
      { label: "مقررات منشورة", value: courses.length },
      { label: "التحاقات مؤكدة", value: enrollmentCounts[0].error ? null : enrollmentCounts[0].count },
      { label: "طلبات قيد المراجعة", value: enrollmentCounts[1].error ? null : enrollmentCounts[1].count },
    ]} />}
    <section className="space-y-3" aria-labelledby="teacher-courses">
      <CourseListHeading id="teacher-courses" className="text-xl font-bold">مقرراتي</CourseListHeading>
      {courses.length ? <ul className="grid gap-3 sm:grid-cols-2">{courses.map((course) => (
        <li key={course.id} className="soft-card p-4">
          <Link href={`/courses/${course.id}`} className="inline-flex min-h-11 items-center font-semibold text-primary underline">{course.title}</Link>
          <p className="text-sm leading-7 text-muted-foreground">{course.description}</p>
        </li>
      ))}</ul> : <p className="text-muted-foreground">مفيش مقررات مسندة لحسابك حاليًا.</p>}
    </section>
  </main>;
}
