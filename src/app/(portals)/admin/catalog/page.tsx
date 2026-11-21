import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";
import { AuthSubmit } from "@/features/auth/form-controls";
import { publishCourse, reviewEnrollment } from "@/features/catalog/catalog-admin-actions";

export default async function CatalogAdmin({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const account = await getAccount();
  const client = ownerClient();
  if (!client || !account?.roles.some((role) => role === "owner" || role === "admin")) redirect("/account");
  const [{ data: grades }, { data: subjects }, { data: requests }, { data: drafts }, { notice }] = await Promise.all([
    client.from("grades").select("id,name").order("stage_id").order("position"),
    client.from("subjects").select("id,name").order("name"),
    client.from("course_enrollments").select("course_id, requester_id, learner_name, courses(title)")
      .eq("status", "pending").order("created_at").limit(50),
    client.from("courses").select("id,title,description,track,course_units(title,position,lessons(title,body,position))")
      .eq("status", "draft").order("title").limit(100),
    searchParams,
  ]);
  return (
    <PortalShell role="admin">
      <main className="container-shell space-y-7 pt-28 pb-10" id="main-content">
        <h1 className="text-2xl font-bold">إدارة المقررات والالتحاق</h1>
        <Link href="/admin/teacher-applications" className="inline-flex min-h-11 items-center text-primary underline">طلبات تقديم المدرسين</Link>
        {notice && <p role="status" className="rounded-lg bg-accent p-3">
          {notice === "published" ? "تم نشر المقرر." : notice === "reviewed" ? "تمت مراجعة الطلب." : "تعذّر الحفظ. راجع البيانات وحاول مرة تانية."}
        </p>}
        <form action={publishCourse} className="soft-card grid max-w-2xl gap-4 p-5">
          <h2 className="text-lg font-bold">نشر مقرر جديد</h2>
          <label className="grid gap-2 text-sm font-semibold">اسم المقرر<input name="title" className="field" minLength={3} maxLength={160} required /></label>
          <label className="grid gap-2 text-sm font-semibold">الوصف<textarea name="description" className="field min-h-24 py-2" maxLength={3000} /></label>
          <label className="grid gap-2 text-sm font-semibold">الصف<select name="grade" className="field" required defaultValue=""><option value="" disabled>اختر الصف</option>
            {grades?.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold">المادة<select name="subject" className="field" required defaultValue=""><option value="" disabled>اختر المادة</option>
            {subjects?.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold">المسار<select name="track" className="field"><option value="arabic">عربي</option><option value="languages">لغات</option></select></label>
          <AuthSubmit>نشر المقرر</AuthSubmit>
        </form>
        <section className="space-y-3" id="drafts" aria-labelledby="drafts-title">
          <h2 id="drafts-title" className="text-lg font-bold">مسودات المقررات</h2>
          {drafts?.length ? drafts.map((draft) => (
            <details key={draft.id} className="soft-card p-4">
              <summary className="cursor-pointer font-semibold">{draft.title} · {draft.track === "languages" ? "لغات" : "عربي"}</summary>
              <p className="mt-3 text-sm text-muted-foreground">{draft.description}</p>
              {[...draft.course_units].sort((a, b) => a.position - b.position).map((unit) => (
                <section key={unit.position} className="mt-4 rounded-lg border p-3">
                  <h3 className="font-bold">{unit.title}</h3>
                  {[...unit.lessons].sort((a, b) => a.position - b.position).map((lesson) => (
                    <details key={lesson.position} className="mt-2 border-t pt-2">
                      <summary className="cursor-pointer text-sm font-semibold">{lesson.title}</summary>
                      <p className="mt-2 whitespace-pre-line text-sm leading-7">{lesson.body}</p>
                    </details>
                  ))}
                </section>
              ))}
            </details>
          )) : <p className="text-muted-foreground">مفيش مسودات للمراجعة.</p>}
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-bold">طلبات الالتحاق قيد المراجعة</h2>
          {requests?.length ? requests.map((request) => <article key={`${request.course_id}-${request.requester_id}`} className="soft-card flex flex-wrap items-center justify-between gap-3 p-4">
            <p>{request.learner_name} · <Link className="underline" href={`/courses/${request.course_id}`}>عرض المقرر</Link></p>
            <form action={reviewEnrollment.bind(null, request.course_id, request.requester_id)} className="flex gap-2">
              <button className="min-h-11 rounded-lg bg-primary px-4 text-primary-foreground" name="status" value="active">قبول</button>
              <button className="min-h-11 rounded-lg border px-4" name="status" value="declined">رفض</button>
            </form>
          </article>) : <p className="text-muted-foreground">مفيش طلبات قيد المراجعة.</p>}
        </section>
      </main>
    </PortalShell>
  );
}
