import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { getAccount } from "@/features/auth/supabase-server";
import { AuthSubmit } from "@/features/auth/form-controls";
import { enrollInCourse, getCourseEnrollments, getEnrollmentLearners } from "@/features/catalog/enrollment-actions";
import { readPublishedCourse } from "@/features/catalog/live-catalog";
import { resolveCourseEnrollment } from "@/features/catalog/catalog-data";
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
  const enrollments = enrollmentResult?.state === "ready" ? enrollmentResult.data : [];
  const learners = learnersResult?.state === "ready" ? learnersResult.data : [];
  const learnerStates = parent
    ? learners.map(({ student_id, profiles }) => ({
      student_id,
      name: profiles.display_name,
      enrollment: resolveCourseEnrollment(enrollments, course.id, student_id),
    }))
    : account?.roles.includes("student") ? [{
      student_id: account.user.id,
      name: account.name,
      enrollment: resolveCourseEnrollment(enrollments, course.id, account.user.id),
    }] : [];
  const existing = parent ? undefined : learnerStates[0]?.enrollment;
  const unresolvedLegacy = parent
    ? enrollments.find((row) => row.course_id === course.id && row.student_id === null && row.requester_id === account?.user.id)
    : undefined;
  const parentHasCourseRequest = parent
    ? enrollments.some((row) => row.course_id === course.id && row.requester_id === account?.user.id)
    : false;
  const requestableLearners = parent && !parentHasCourseRequest
    ? learners.filter(({ student_id }) => !resolveCourseEnrollment(enrollments, course.id, student_id))
    : [];
  const allowed = account?.roles.some((role) => role === "parent" || role === "student");
  const showRequestForm = !!account && allowed && enrollmentResult?.state === "ready"
    && (!parent || learnersResult?.state === "ready") && !unresolvedLegacy
    && (parent ? requestableLearners.length > 0 : !existing);
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
        {learnerStates.map(({ student_id, name, enrollment }) => <div key={student_id} className="grid gap-3 rounded-lg border p-3">
          {parent && <p className="font-semibold">{name}</p>}
          {enrollment ? <>
            <p role="status" className="rounded-lg bg-accent p-3 text-sm">
              {enrollment.status === "active" ? "التحاقك بالمقرر مؤكد." : enrollment.status === "declined" ? "لم يُقبل طلب الالتحاق." : "طلب الالتحاق قيد المراجعة."}
            </p>
            {enrollment.student_id === null && <p role="alert" className="text-sm text-destructive">هوية الطالب في طلب الالتحاق القديم غير محسومة.</p>}
            {enrollment.status === "active" && enrollment.student_id !== null && <Button asChild className="w-full"><Link href={`/courses/${course.id}/lessons`}>افتح الدروس</Link></Button>}
          </> : parent ? <p className="text-sm text-muted-foreground">لم يُرسل طلب الالتحاق لهذا الطالب بعد.</p> : null}
        </div>)}
        {unresolvedLegacy && <p role="alert" className="text-sm text-destructive">هوية الطالب في طلب الالتحاق القديم غير محسومة.</p>}
        {showRequestForm ? <form action={enrollInCourse.bind(null, course.id)} className="grid gap-4">
          {parent && <label className="grid gap-2 text-sm font-semibold">الطالب
            <select name="student" className="field" required defaultValue="">
              <option value="" disabled>اختر الطالب</option>
              {requestableLearners.map(({ student_id, profiles }) => <option key={student_id} value={student_id}>{profiles.display_name}</option>)}
            </select>
          </label>}
          <AuthSubmit>إرسال طلب الالتحاق</AuthSubmit>
        </form> : enrollmentResult?.state === "error" || learnersResult?.state === "error" ? null : !account ? <Button asChild className="w-full">
          <Link href={`/login?next=${encodeURIComponent(`/courses/${course.id}`)}`}>سجّل دخولك للالتحاق</Link>
        </Button> : allowed ? parent && !learners.length ? <p className="text-sm text-muted-foreground">مفيش طلاب نشطون مرتبطون بحسابك.</p> : null : <p className="text-sm text-muted-foreground">الالتحاق متاح لحسابات الطلاب وأولياء الأمور.</p>}
      </aside>
    </div>
  </div>;
}
