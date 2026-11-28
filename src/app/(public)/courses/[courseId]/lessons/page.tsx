import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAccount, sessionClient } from "@/features/auth/supabase-server";
import { completeLesson } from "@/features/catalog/lesson-progress-actions";
import { summarizeLessonProgress } from "@/features/catalog/lesson-progress";
import { AuthSubmit } from "@/features/auth/form-controls";
import { readPublishedCourse } from "@/features/catalog/live-catalog";

export default async function CourseLessons({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<{ progress?: string }> }) {
  const { courseId } = await params;
  const [courseResult, account] = await Promise.all([readPublishedCourse(courseId), getAccount()]);
  if (courseResult.state === "error") {
    if (courseResult.kind === "configuration") notFound();
    return <div className="container-shell py-8"><p role="alert" className="soft-card p-5 text-destructive">تعذّر تحميل المقرر حاليًا.</p></div>;
  }
  const course = courseResult.data;
  if (!course) notFound();
  if (!account) redirect(`/courses/${course.id}`);
  const client = await sessionClient();
  if (!client) return <div className="container-shell py-8"><p role="alert" className="soft-card p-5 text-destructive">تعذّر تحميل الدروس حاليًا.</p></div>;
  const { data: canRead, error: accessError } = await client.rpc("can_read_course_lessons", { p_course_id: course.id });
  if (accessError || canRead !== true) {
    if (!accessError && canRead === false) redirect(`/courses/${course.id}`);
    return <div className="container-shell py-8"><p role="alert" className="soft-card p-5 text-destructive">تعذّر التحقق من صلاحية الدروس حاليًا.</p></div>;
  }
  const { data, error } = await client.from("course_units")
    .select("id,title,position,lessons(id,title,body,position)").eq("course_id", course.id).order("position");
  const { progress: progressNotice } = await searchParams;
  const lessonIds = (data ?? []).flatMap(({ lessons }) => lessons.map(({ id }) => id));
  const enrollment = account.roles.includes("student") && lessonIds.length
    ? await client.from("course_enrollments").select("course_id").eq("course_id", course.id)
      .eq("student_id", account.user.id).eq("status", "active").limit(1).maybeSingle()
    : null;
  const completionResult = enrollment?.data && !enrollment.error
    ? await client.from("lesson_completions").select("lesson_id,lessons!inner(course_units!inner(course_id))")
      .eq("lessons.course_units.course_id", course.id)
    : null;
  const completed = new Set(completionResult?.data?.map(({ lesson_id }) => lesson_id));
  const progress = completionResult && !completionResult.error
    ? summarizeLessonProgress(lessonIds, completed)
    : null;
  return <div className="container-shell grid gap-5 py-8">
    <Link href={`/courses/${courseId}`} className="inline-flex min-h-11 items-center text-primary underline">الرجوع للمقرر</Link>
    <h1 className="text-2xl font-bold">دروس {course.title}</h1>
    {progressNotice === "failed" && <p role="alert">تعذّر تسجيل إكمال الدرس.</p>}
    {(enrollment?.error || completionResult?.error) && <p role="alert">تعذّر تحميل تقدّم المقرر حاليًا.</p>}
    {progress?.percent != null && (
      <p className="soft-card p-3">تم إكمال {progress.completed} من {progress.total} دروس ({progress.percent}٪).</p>
    )}
    {error && <p role="alert">تعذّر تحميل الدروس حاليًا.</p>}
    {!error && !data?.length && <p>لم تُنشر دروس لهذا المقرر بعد.</p>}
    {!error && data?.map((unit) => <section key={unit.id} className="soft-card grid gap-3 p-5">
      <h2 className="text-lg font-bold">{unit.title}</h2>
      {unit.lessons.sort((a, b) => a.position - b.position).map((lesson) => <details key={lesson.id} className="rounded-lg border p-3">
        <summary className="cursor-pointer font-semibold">{lesson.title}</summary>
        <p className="mt-2 whitespace-pre-line leading-7">{lesson.body}</p>
        {progress && (completed.has(lesson.id)
          ? <p className="mt-2 font-semibold">تم إكمال الدرس</p>
          : <form className="mt-2" action={completeLesson.bind(null, course.id, lesson.id)}>
              <AuthSubmit>تسجيل إكمال الدرس</AuthSubmit>
            </form>)}
      </details>)}
    </section>)}
  </div>;
}
