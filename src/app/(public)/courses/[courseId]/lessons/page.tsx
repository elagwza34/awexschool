import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAccount, sessionClient } from "@/features/auth/supabase-server";
import { getCourseEnrollments } from "@/features/catalog/enrollment-actions";
import { readPublishedCourse } from "@/features/catalog/live-catalog";

export default async function CourseLessons({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const [courseResult, account] = await Promise.all([readPublishedCourse(courseId), getAccount()]);
  if (courseResult.state === "error") {
    if (courseResult.kind === "configuration") notFound();
    return <div className="container-shell py-8"><p role="alert" className="soft-card p-5 text-destructive">تعذّر تحميل المقرر حاليًا.</p></div>;
  }
  const course = courseResult.data;
  if (!course) notFound();
  const enrollmentResult = account ? await getCourseEnrollments() : null;
  if (enrollmentResult?.state === "error") {
    return <div className="container-shell py-8"><p role="alert" className="soft-card p-5 text-destructive">تعذّر التحقق من الالتحاق حاليًا.</p></div>;
  }
  const active = enrollmentResult?.state === "ready" &&
    enrollmentResult.data.some((row) => row.course_id === course.id && row.status === "active");
  if (!active) redirect(`/courses/${course.id}`);
  const client = await sessionClient();
  if (!client) return <div className="container-shell py-8"><p role="alert" className="soft-card p-5 text-destructive">تعذّر تحميل الدروس حاليًا.</p></div>;
  const { data, error } = await client.from("course_units")
    .select("id,title,position,lessons(id,title,body,position)").eq("course_id", course.id).order("position");
  return <div className="container-shell grid gap-5 py-8">
    <Link href={`/courses/${courseId}`} className="inline-flex min-h-11 items-center text-primary underline">الرجوع للمقرر</Link>
    <h1 className="text-2xl font-bold">دروس {course.title}</h1>
    {error && <p role="alert">تعذّر تحميل الدروس حاليًا.</p>}
    {!error && !data?.length && <p>لم تُنشر دروس لهذا المقرر بعد.</p>}
    {!error && data?.map((unit) => <section key={unit.id} className="soft-card grid gap-3 p-5">
      <h2 className="text-lg font-bold">{unit.title}</h2>
      {unit.lessons.sort((a, b) => a.position - b.position).map((lesson) => <details key={lesson.id} className="rounded-lg border p-3">
        <summary className="cursor-pointer font-semibold">{lesson.title}</summary>
        <p className="mt-2 whitespace-pre-line leading-7">{lesson.body}</p>
      </details>)}
    </section>)}
  </div>;
}
