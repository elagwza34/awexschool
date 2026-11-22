import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LiveTeacherPhoto } from "@/components/live-teacher-photo";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";
import { assignCourseTeacher } from "@/features/teachers/admin-teacher-actions";
import { AdminTeachersNav } from "@/features/teachers/admin-teachers-nav";
import { TeacherOnboardingDialog, type TeacherApplicationDraft } from "@/features/teachers/teacher-onboarding-dialog";

export const metadata = { title: "المدرسين | لوحة الإدارة" };

type TeacherAccount = {
  user_id: string;
  display_name: string;
  status: string;
  teacher_profiles: {
    full_name: string; qualification: string | null; subjects: { name: string } | null;
    experience_years: number | null; portrait_path: string | null; bio: string | null;
    onboarding_details: NonNullable<TeacherApplicationDraft["details"]>;
  } | null;
};

export default async function AdminTeachersPage({ searchParams }: {
  searchParams: Promise<{ view?: string; message?: string; application?: string; created?: string }>;
}) {
  const account = await getAccount();
  const client = ownerClient();
  if (!client || !account?.roles.some((role) => role === "admin" || role === "owner")) redirect("/account");
  const { view, message, application, created } = await searchParams;
  const assignments = view === "assignments";
  const [teachers, courses, groups, subjects, grades, applicationResult] = await Promise.all([
    client.from("profiles")
      .select("user_id,display_name,status,account_roles!inner(role_code),teacher_profiles(full_name,qualification,subjects(name),experience_years,portrait_path,bio,onboarding_details)")
      .eq("account_roles.role_code", "teacher").order("display_name")
      .overrideTypes<TeacherAccount[], { merge: false }>(),
    assignments ? client.from("courses").select("id,title,teacher_id").eq("status", "published").order("title") : null,
    assignments ? client.from("learning_groups").select("id,name,teacher_id").order("name") : null,
    !assignments ? client.from("subjects").select("id,name").order("name") : null,
    !assignments ? client.from("grades").select("id,name").order("stage_id").order("position") : null,
    !assignments && application && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(application)
      ? client.from("teacher_applications").select("id,full_name,email,subject_id,details")
        .eq("id", application).in("status", ["pending", "accepted"]).is("teacher_user_id", null)
        .maybeSingle().overrideTypes<TeacherApplicationDraft, { merge: false }>()
      : null,
  ]);
  const roster = teachers.data ?? [];
  const available = roster.filter(({ status, teacher_profiles }) => status === "active" && teacher_profiles);
  const teacherNames = new Map(roster.map((teacher) => [teacher.user_id, teacher.teacher_profiles?.full_name ?? teacher.display_name]));
  const feedback = message === "added" ? "تم إنشاء حساب المدرس." : message === "saved" ? "تم حفظ إسناد المقرر."
    : message === "cleanup-failed" ? "الحساب اتعمل لكن الدور ما اتحفظش. راجع دليل الحسابات قبل استخدامه."
    : message ? "تعذّر الحفظ. راجع البيانات وحاول مرة تانية." : null;

  return (
    <main id="main-content" tabIndex={-1} className="dashboard-width space-y-5 pt-5 pb-10">
      <AdminTeachersNav active={assignments ? "assignments" : "accounts"} />
      {feedback && <p role="status" className="soft-card p-4">{feedback}</p>}
      {teachers.error && <p role="alert">تعذّر تحميل حسابات المدرسين.</p>}
      {assignments ? <>
        <section className="space-y-3" aria-labelledby="teacher-course-assignments">
          <h2 id="teacher-course-assignments" className="text-lg font-bold">مسؤولو المقررات</h2>
          <p className="text-sm text-muted-foreground">إسناد مسؤول للمقرر اختياري. مدرس كل مجموعة بيتحدد من إعدادات المجموعة.</p>
          {courses?.error ? <p role="alert">تعذّر تحميل المقررات.</p> :
            courses?.data?.length ? <ul className="grid gap-3 sm:grid-cols-2">
              {courses.data.map((course) => (
                <li key={course.id} className="soft-card space-y-3 p-4">
                  <h3 className="font-semibold">{course.title}</h3>
                  <form action={assignCourseTeacher.bind(null, course.id)} className="grid gap-2">
                    <label htmlFor={`teacher-${course.id}`} className="text-sm">مسؤول المقرر</label>
                    <select id={`teacher-${course.id}`} name="teacher" className="field" defaultValue={course.teacher_id ?? ""}>
                      <option value="">بدون مسؤول</option>
                      {course.teacher_id && !available.some(({ user_id }) => user_id === course.teacher_id) &&
                        <option value={course.teacher_id} disabled>{teacherNames.get(course.teacher_id) ?? "المدرس الحالي"} — غير متاح للإسناد</option>}
                      {available.map(({ user_id }) => <option key={user_id} value={user_id}>{teacherNames.get(user_id)}</option>)}
                    </select>
                    <Button type="submit" variant="outline" className="justify-self-start" disabled={!!teachers.error}>حفظ الإسناد</Button>
                  </form>
                </li>
              ))}
            </ul> : <p className="text-muted-foreground">مفيش مقررات منشورة.</p>}
        </section>
        <section className="space-y-3" aria-labelledby="teacher-group-assignments">
          <h2 id="teacher-group-assignments" className="text-lg font-bold">مدرسو المجموعات</h2>
          {groups?.error ? <p role="alert">تعذّر تحميل المجموعات.</p> : groups?.data?.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {groups.data.map((group) => <li key={group.id} className="soft-card space-y-2 p-4">
                <h3 className="font-semibold">{group.name}</h3>
                <p className="text-sm text-muted-foreground">{teacherNames.get(group.teacher_id) ?? "بيانات المدرس غير متاحة"}</p>
                <Link href={`/admin/group-requests?group=${group.id}`} className="inline-flex min-h-11 items-center text-sm text-primary underline">تعديل المجموعة</Link>
              </li>)}
            </ul>
          ) : <p className="text-muted-foreground">مفيش مجموعات مسجلة.</p>}
        </section>
      </> : <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">حسابات وملفات المدرسين</h2>
          {!subjects?.error && !grades?.error && <TeacherOnboardingDialog
            key={applicationResult?.data?.id ?? created ?? "new"} application={applicationResult?.data ?? undefined}
            subjects={subjects?.data ?? []} grades={grades?.data ?? []} />}
        </div>
        {(subjects?.error || grades?.error) && <p role="alert">تعذّر تحميل المواد والصفوف.</p>}
        {application && !applicationResult?.data && <p role="alert">طلب التقديم ده غير متاح لاستكمال إنشاء الحساب.</p>}
        {roster.length ? <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roster.map(({ user_id, display_name, status, teacher_profiles }) => (
            <li key={user_id} className="soft-card space-y-2 p-4">
              <div className="flex items-center gap-3">
                <LiveTeacherPhoto name={teacher_profiles?.full_name ?? display_name} path={teacher_profiles?.portrait_path ?? null} />
                <h3 className="font-bold">{teacher_profiles?.full_name ?? display_name}</h3>
              </div>
              <p className="text-sm">{status === "active" ? "حساب نشط" : "حساب غير نشط"}</p>
              {teacher_profiles ? <p className="text-sm text-muted-foreground">
                {[teacher_profiles.subjects?.name, teacher_profiles.qualification].filter(Boolean).join(" · ")}
              </p> : <p className="text-sm text-muted-foreground">ملف المدرس لسه ما اتكمّلش.</p>}
              {teacher_profiles && <details className="space-y-2 text-sm">
                <summary className="min-h-11 cursor-pointer py-3 font-semibold">تفاصيل الملف</summary>
                {teacher_profiles.experience_years != null && <p>سنوات الخبرة: {teacher_profiles.experience_years}</p>}
                {teacher_profiles.onboarding_details.phone && <p>رقم الهاتف: <bdi>{teacher_profiles.onboarding_details.phone}</bdi></p>}
                {teacher_profiles.onboarding_details.governorate && <p>المحافظة: {teacher_profiles.onboarding_details.governorate}</p>}
                {!!teacher_profiles.onboarding_details.grades?.length && <p>الصفوف: {grades?.data?.filter(({ id }) => teacher_profiles.onboarding_details.grades?.includes(id)).map(({ name }) => name).join("، ")}</p>}
                {teacher_profiles.bio && <p className="whitespace-pre-line">{teacher_profiles.bio}</p>}
                {teacher_profiles.onboarding_details.approach && <p className="whitespace-pre-line">{teacher_profiles.onboarding_details.approach}</p>}
                {teacher_profiles.onboarding_details.video?.startsWith("https://") && <a href={teacher_profiles.onboarding_details.video} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-primary underline">الفيديو التعريفي</a>}
              </details>}
            </li>
          ))}
        </ul> : !teachers.error && <p className="text-muted-foreground">مفيش حسابات مدرسين مسجلة.</p>}
      </>}
    </main>
  );
}
