import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { getAccount } from "@/features/auth/supabase-server";
import { AuthSubmit } from "@/features/auth/form-controls";
import { enrollInCourse, getCourseEnrollments, getEnrollmentLearners } from "@/features/catalog/enrollment-actions";
import { readPublishedCourse } from "@/features/catalog/live-catalog";
import { LiveTeacherPhoto } from "@/components/live-teacher-photo";

export async function generateMetadata({ params }: { params: Promise<{ courseId: string }> }) {
  const result = await readPublishedCourse((await params).courseId);
  return { title: result.state === "ready" && result.data ? result.data.title : "مقرر غير موجود" };
}

export default async function CoursePage({ params, searchParams }: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ enrollment?: string }>;
}) {
  const [{ courseId }, { enrollment }, account] = await Promise.all([params, searchParams, getAccount()]);
  const courseResult = await readPublishedCourse(courseId);
  if (courseResult.state === "error") {
    if (courseResult.kind === "configuration") notFound();
    return <div className="container-shell py-8"><p role="alert" className="soft-card p-5 text-destructive">تعذّر تحميل المقرر حاليًا.</p></div>;
  }
  const course = courseResult.data;
  if (!course) notFound();
  const parent = !!account?.roles.includes("parent");
  const [enrollmentResult, learnersResult] = await Promise.all([
    account ? getCourseEnrollments() : null,
    parent ? getEnrollmentLearners() : null,
  ]);
  const existing = enrollmentResult?.state === "ready"
    ? enrollmentResult.data.find((row) => row.course_id === course.id)
    : undefined;
  const learners = learnersResult?.state === "ready" ? learnersResult.data : [];
  const allowed = account?.roles.some((role) => role === "parent" || role === "student");
  const teacher = course.teacher_profiles as unknown as { user_id: string; full_name: string; portrait_path: string | null } | null;

  return <div className="container-shell py-8">
    <Breadcrumbs items={[{ label: "المقررات", href: "/courses" }, { label: course.title }]} />
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_21rem]">
      <div className="soft-card p-6 sm:p-8">
        <h1 className="text-3xl font-bold">{course.title}</h1>
        {course.description && <p className="mt-4 whitespace-pre-line leading-8 text-muted-foreground">{course.description}</p>}
        {teacher && <Link href={`/teachers/${teacher.user_id}`} className="mt-5 flex items-center gap-4 font-semibold text-primary underline">
          <LiveTeacherPhoto name={teacher.full_name} path={teacher.portrait_path} />{teacher.full_name}
        </Link>}
      </div>
      <aside className="soft-card space-y-4 p-6">
        <h2 className="text-lg font-bold">الالتحاق بالمقرر</h2>
        {enrollment === "failed" && <p role="alert" className="text-sm text-destructive">تعذّر حفظ الطلب. جرّب مرة تانية.</p>}
        {enrollment === "invalid" && <p role="alert" className="text-sm text-destructive">اختر طالبًا نشطًا مرتبطًا بحسابك وأعد الإرسال.</p>}
        {enrollment === "conflict" && <p role="alert" className="text-sm text-destructive">طلب الالتحاق ده مرتبط بطالب آخر، ومينفعش تغيير الطالب لنفس المقرر.</p>}
        {enrollment === "identity" && <p role="alert" className="text-sm text-destructive">هوية الطالب في طلب الالتحاق القديم غير محسومة. راجع الإدارة قبل إعادة الإرسال.</p>}
        {enrollment === "unavailable" && <p role="alert" className="text-sm text-destructive">تعذّر التحقق من المقرر حاليًا.</p>}
        {enrollmentResult?.state === "error" && <p role="alert" className="text-sm text-destructive">تعذّر التحقق من حالة الالتحاق حاليًا.</p>}
        {learnersResult?.state === "error" && <p role="alert" className="text-sm text-destructive">تعذّر تحميل قائمة الطلاب المرتبطين.</p>}
        {existing ? <>
          <p role="status" className="rounded-lg bg-accent p-3 text-sm">
            {existing.status === "active" ? "التحاقك بالمقرر مؤكد." : existing.status === "declined" ? "لم يُقبل طلب الالتحاق." : "طلب الالتحاق قيد المراجعة."}
          </p>
          {existing.student_id === null && <p role="alert" className="text-sm text-destructive">هوية الطالب في طلب الالتحاق القديم غير محسومة.</p>}
          {existing.status === "active" && existing.student_id !== null && <Button asChild className="w-full"><Link href={`/courses/${course.id}/lessons`}>افتح الدروس</Link></Button>}
        </> : enrollmentResult?.state === "error" ? null : !account ? <Button asChild className="w-full">
          <Link href={`/login?next=${encodeURIComponent(`/courses/${course.id}`)}`}>سجّل دخولك للالتحاق</Link>
        </Button> : allowed ? learnersResult?.state === "error" ? null : parent && !learners.length ? <p className="text-sm text-muted-foreground">مفيش طلاب نشطون مرتبطون بحسابك.</p> : <form action={enrollInCourse.bind(null, course.id)} className="grid gap-4">
          {parent && <label className="grid gap-2 text-sm font-semibold">الطالب
            <select name="student" className="field" required defaultValue="">
              <option value="" disabled>اختر الطالب</option>
              {learners.map(({ student_id, profiles }) => <option key={student_id} value={student_id}>{profiles.display_name}</option>)}
            </select>
          </label>}
          <AuthSubmit>إرسال طلب الالتحاق</AuthSubmit>
        </form> : <p className="text-sm text-muted-foreground">الالتحاق متاح لحسابات الطلاب وأولياء الأمور.</p>}
      </aside>
    </div>
  </div>;
}
