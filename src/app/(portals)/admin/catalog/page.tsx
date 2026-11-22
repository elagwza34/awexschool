import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";
import { AuthSubmit } from "@/features/auth/form-controls";
import { archiveCourse, publishCourse, reviewEnrollment } from "@/features/catalog/catalog-admin-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PublishedCourseCard } from "@/components/published-course-card";
import { cn } from "@/lib/utils";

export default async function CatalogAdmin({ searchParams }: { searchParams: Promise<{ notice?: string; published?: string; tab?: string; track?: string }> }) {
  const account = await getAccount();
  const client = ownerClient();
  if (!client || !account?.roles.some((role) => role === "owner" || role === "admin")) redirect("/account");
  const { notice, published, tab, track } = await searchParams;
  const activeTrack = track === "languages" ? "languages" : "arabic";
  const showEnrollments = tab === "enrollments";
  const showArchive = tab === "archived";
  const showCourses = !showEnrollments && !showArchive;
  const [grades, subjects, requests, courses, archived] = await Promise.all([
    showCourses ? client.from("grades").select("id,name").order("stage_id").order("position") : null,
    showCourses ? client.from("subjects").select("id,name").order("name") : null,
    showEnrollments ? client.from("course_enrollments").select("course_id, requester_id, learner_name")
      .eq("status", "pending").order("created_at").limit(50) : null,
    showCourses ? client.from("courses").select("id,title,description,grade_id,track").eq("status", "published").eq("track", activeTrack).order("title") : null,
    showArchive ? client.from("courses").select("id,title,description,track").eq("status", "archived").order("title") : null,
  ]);
  return (
      <main className="dashboard-width space-y-7 pt-5 pb-10" id="main-content">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">إدارة المقررات</h1>
          {showCourses && <Dialog key={published ?? "publish"} defaultOpen={notice === "publish-failed"}>
            <DialogTrigger asChild>
              <Button type="button" className="ms-auto min-h-11">نشر مقرر جديد</Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sm:p-6">
              <DialogHeader className="pe-12 text-start">
                <DialogTitle>نشر مقرر جديد</DialogTitle>
                <DialogDescription>أدخل بيانات المقرر عشان يظهر في قائمة المقررات بعد النشر.</DialogDescription>
              </DialogHeader>
              {notice === "publish-failed" && <p role="alert" className="text-sm text-destructive">تعذّر نشر المقرر. راجع البيانات وحاول مرة تانية.</p>}
              <form action={publishCourse} className="grid gap-4">
                <label className="grid gap-2 text-sm font-semibold">اسم المقرر<input name="title" className="field" minLength={3} maxLength={160} required /></label>
                <label className="grid gap-2 text-sm font-semibold">الوصف<textarea name="description" className="field min-h-24 py-2" maxLength={3000} /></label>
                <div className="grid gap-2 text-sm font-semibold">
                  <label htmlFor="publish-course-grade">الصف</label>
                  <select id="publish-course-grade" name="grade" className="field" required defaultValue="">
                    <option value="" disabled>اختر الصف</option>
                    {grades?.data?.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}
                  </select>
                </div>
                <div className="grid gap-2 text-sm font-semibold">
                  <label htmlFor="publish-course-subject">المادة</label>
                  <select id="publish-course-subject" name="subject" className="field" required defaultValue="">
                    <option value="" disabled>اختر المادة</option>
                    {subjects?.data?.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                  </select>
                </div>
                <div className="grid gap-2 text-sm font-semibold">
                  <label htmlFor="publish-course-track">المسار</label>
                  <select id="publish-course-track" name="track" className="field" defaultValue={activeTrack}>
                    <option value="arabic">عربي</option>
                    <option value="languages">لغات</option>
                  </select>
                </div>
                <AuthSubmit>نشر المقرر</AuthSubmit>
              </form>
            </DialogContent>
          </Dialog>}
        </div>
        <nav aria-label="أقسام المقررات" className="flex gap-2 overflow-x-auto border-b">
          {[
            { href: "/admin/catalog", label: "المقررات", active: showCourses },
            { href: "/admin/catalog?tab=archived", label: "مقررات مؤرشفة", active: showArchive },
            { href: "/admin/catalog?tab=enrollments", label: "طلبات الالتحاق", active: showEnrollments },
          ].map(({ href, label, active }) => (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className={cn("inline-flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-3 text-sm font-semibold",
                active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:bg-accent")}>
              {label}
            </Link>
          ))}
        </nav>
        {notice && notice !== "publish-failed" && <p role="status" className="rounded-lg bg-accent p-3">
          {notice === "published" ? "تم نشر المقرر." : notice === "reviewed" ? "تمت مراجعة الطلب." :
            notice === "archived" ? "اتنقل المقرر لتبويب مقررات مؤرشفة." :
            notice === "archive-failed" ? "تعذّرت أرشفة المقرر. حدّث الصفحة وحاول مرة تانية." :
            "تعذّر الحفظ. راجع البيانات وحاول مرة تانية."}
        </p>}
        {showCourses &&
        <section className="space-y-3" aria-labelledby="published-courses-title">
          <h2 id="published-courses-title" className="text-lg font-bold">المقررات المنشورة</h2>
          <nav aria-label="مسارات المقررات المنشورة" className="flex gap-2 border-b">
            {([{ value: "arabic", label: "عربي" }, { value: "languages", label: "لغات" }] as const).map(({ value, label }) => (
              <Link key={value} href={`/admin/catalog?track=${value}`} aria-current={activeTrack === value ? "page" : undefined}
                className={cn("inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold",
                  activeTrack === value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:bg-accent")}>
                {label}
              </Link>
            ))}
          </nav>
          {courses?.error ? <p role="alert">تعذّر تحميل المقررات المنشورة.</p> : courses?.data?.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.data.map((course) => (
                <li key={course.id}>
                  <PublishedCourseCard course={course} grade={grades?.data?.find(({ id }) => id === course.grade_id)?.name} headingLevel={3}
                    actions={<Dialog>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" className="min-h-11" aria-label={`أرشفة ${course.title}`}>أرشفة</Button>
                      </DialogTrigger>
                      <DialogContent dir="rtl">
                        <DialogHeader className="pe-12 text-start">
                          <DialogTitle>أرشفة المقرر</DialogTitle>
                          <DialogDescription>«{course.title}» هيتنقل للأرشيف ويختفي من المقررات المنشورة وصفحة التسجيل فيه.</DialogDescription>
                        </DialogHeader>
                        <form action={archiveCourse.bind(null, course.id, activeTrack)} className="flex flex-wrap gap-2">
                          <div><AuthSubmit pending="جارٍ الأرشفة…">تأكيد الأرشفة</AuthSubmit></div>
                          <DialogClose asChild><Button type="button" variant="outline" className="min-h-11">إلغاء</Button></DialogClose>
                        </form>
                      </DialogContent>
                    </Dialog>} />
                </li>
              ))}
            </ul>
          ) : <p className="text-muted-foreground">مفيش مقررات منشورة في المسار ده حاليًا.</p>}
        </section>
        }
        {showArchive && <section className="space-y-3" aria-labelledby="archived-courses-title">
          <h2 id="archived-courses-title" className="text-lg font-bold">مقررات مؤرشفة</h2>
          {archived?.error ? <p role="alert">تعذّر تحميل المقررات المؤرشفة.</p> : archived?.data?.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {archived.data.map((course) => (
                <li key={course.id} className="soft-card space-y-2 p-4">
                  <h3 className="font-semibold">{course.title}</h3>
                  <p className="text-sm text-muted-foreground">{course.track === "languages" ? "لغات" : "عربي"}</p>
                  {course.description && <p className="whitespace-pre-line break-words text-sm">{course.description}</p>}
                </li>
              ))}
            </ul>
          ) : <p className="text-muted-foreground">مفيش مقررات مؤرشفة حاليًا.</p>}
        </section>}
        {showEnrollments && <section id="enrollment-requests" className="space-y-3" aria-labelledby="enrollment-requests-title">
          <h2 id="enrollment-requests-title" className="text-lg font-bold">طلبات الالتحاق قيد المراجعة</h2>
          {requests?.error ? <p role="alert">تعذّر تحميل طلبات الالتحاق.</p> : requests?.data?.length ? requests.data.map((request) => <article key={`${request.course_id}-${request.requester_id}`} className="soft-card flex flex-wrap items-center justify-between gap-3 p-4">
            <p>{request.learner_name} · <Link className="underline" href={`/courses/${request.course_id}`}>عرض المقرر</Link></p>
            <form action={reviewEnrollment.bind(null, request.course_id, request.requester_id)} className="flex gap-2">
              <button className="min-h-11 rounded-lg bg-primary px-4 text-primary-foreground" name="status" value="active">قبول</button>
              <button className="min-h-11 rounded-lg border px-4" name="status" value="declined">رفض</button>
            </form>
          </article>) : <p className="text-muted-foreground">مفيش طلبات قيد المراجعة.</p>}
        </section>}
      </main>
  );
}
