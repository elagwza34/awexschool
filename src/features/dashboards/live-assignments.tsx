import { redirect } from "next/navigation";
import { AuthSubmit } from "@/features/auth/form-controls";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";
import { assignmentScope, cairoDate, type AssignmentRole } from "./live-assignment-access";
import { publishPortalAssignment, reviewPortalAssignment, submitPortalAssignment } from "./live-assignment-actions";

export async function LiveAssignments({ role, reviews = false, searchParams }: {
  role: AssignmentRole; reviews?: boolean; searchParams: Promise<{ message?: string }>;
}) {
  const [account, { message }] = await Promise.all([getAccount(), searchParams]);
  const client = ownerClient();
  if (!client || !account?.roles.some((item) => item === role || (role === "admin" && item === "owner"))) redirect("/account");

  const scope = await assignmentScope(client, role, account.user.id);
  let assignmentQuery = client.from("course_assignments").select("id,title,instructions,due_on")
    .order("created_at", { ascending: false }).limit(50);
  if (scope.ids?.length) assignmentQuery = assignmentQuery.in("course_id", scope.ids);
  const [assignmentResult, courseResult] = await Promise.all([
    scope.ids?.length === 0 ? null : assignmentQuery,
    role === "teacher" && !reviews && scope.ids?.length ? client.from("courses").select("id,title").in("id", scope.ids).order("title") : null,
  ]);
  const assignments = assignmentResult?.data ?? [];
  const today = cairoDate();
  const ids = assignments.map(({ id }) => id);
  let submissionQuery = client.from("course_assignment_submissions")
    .select("assignment_id,student_id,response,feedback,profiles(display_name)").in("assignment_id", ids)
    .order("submitted_at", { ascending: false }).limit(200);
  if (scope.students?.length) submissionQuery = submissionQuery.in("student_id", scope.students);
  const submissionResult = ids.length && (reviews || role === "student" || role === "parent") ? await submissionQuery : null;
  const submissions = submissionResult?.data ?? [];
  const failed = scope.error || assignmentResult?.error || courseResult?.error || submissionResult?.error;

  return <main id="main-content" className="dashboard-width space-y-5 py-5">
    <h1 className="text-2xl font-bold">{reviews ? "أعمال للمراجعة" : "الواجبات والتكليفات"}</h1>
    {failed && <p role="alert" className="soft-card p-4">تعذّر تحميل الواجبات.</p>}
    {message && <p role="status" className="soft-card p-4">{message === "saved" ? "تم الحفظ." : "تعذّر الحفظ. راجع البيانات والصلاحية."}</p>}
    {courseResult?.data?.length ? <form action={publishPortalAssignment} className="soft-card grid gap-4 p-5">
      <h2 className="text-lg font-bold">إضافة واجب</h2>
      <label className="grid gap-2 text-sm font-semibold">المقرر
        <select className="field" name="course" defaultValue="" required><option value="" disabled>اختر المقرر</option>
          {courseResult.data.map((course) => <option value={course.id} key={course.id}>{course.title}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold">عنوان الواجب<input className="field" name="title" minLength={3} maxLength={160} required /></label>
      <label className="grid gap-2 text-sm font-semibold">التعليمات<textarea className="field min-h-24 py-2" name="instructions" minLength={5} maxLength={5000} required /></label>
      <label className="grid gap-2 text-sm font-semibold">آخر يوم للتسليم (اختياري)<input className="field" name="due" type="date" /></label>
      <AuthSubmit>نشر الواجب</AuthSubmit>
    </form> : null}
    {reviews ? <section className="grid gap-3">
      {submissions.length ? submissions.map((submission) => {
        const student = submission.profiles as unknown as { display_name: string } | null;
        return <article key={`${submission.assignment_id}-${submission.student_id}`} className="soft-card space-y-3 p-5">
          <h2 className="font-bold">{assignments.find(({ id }) => id === submission.assignment_id)?.title}</h2>
          {student?.display_name && <p className="text-sm text-muted-foreground">{student.display_name}</p>}
          <p className="whitespace-pre-line break-words">{submission.response}</p>
          <form action={reviewPortalAssignment.bind(null, submission.assignment_id, submission.student_id)} className="grid gap-3">
            <label className="grid gap-2 text-sm font-semibold">ملاحظات المراجعة
              <textarea className="field min-h-24 py-2" name="feedback" defaultValue={submission.feedback ?? ""} maxLength={5000} required />
            </label>
            <AuthSubmit>حفظ المراجعة</AuthSubmit>
          </form>
        </article>;
      }) : !failed && <p className="soft-card p-5">لسه مفيش تسليمات للمراجعة.</p>}
    </section> : <ul className="grid gap-3">
      {assignments.map((item) => {
        const matching = submissions.filter(({ assignment_id }) => assignment_id === item.id);
        const open = !item.due_on || item.due_on >= today;
        return <li key={item.id} className="soft-card space-y-3 p-5">
          <h2 className="text-lg font-bold">{item.title}</h2>
          <p className="whitespace-pre-line break-words">{item.instructions}</p>
          {item.due_on && <p className="text-sm text-muted-foreground">آخر يوم للتسليم <bdi>{item.due_on}</bdi></p>}
          {matching.map((submission) => {
            const learner = submission.profiles as unknown as { display_name: string } | null;
            return <div className="rounded-lg bg-accent p-3" key={submission.student_id}>
              <p className="font-semibold">{role === "parent" && learner ? `${learner.display_name} · ` : ""}تم التسليم</p>
              {submission.feedback && <p className="mt-1 whitespace-pre-line break-words text-sm">{submission.feedback}</p>}
            </div>;
          })}
          {role === "student" && !matching.length && (open ? <form action={submitPortalAssignment.bind(null, item.id)} className="grid gap-3">
            <label className="grid gap-2 text-sm font-semibold">الإجابة<textarea className="field min-h-24 py-2" name="response" maxLength={10000} required /></label>
            <AuthSubmit>تسليم الواجب</AuthSubmit>
          </form> : <p className="text-sm">انتهى وقت التسليم.</p>)}
        </li>;
      })}
      {!assignments.length && !failed && <li className="soft-card p-5">لسه مفيش واجبات متاحة.</li>}
    </ul>}
  </main>;
}
