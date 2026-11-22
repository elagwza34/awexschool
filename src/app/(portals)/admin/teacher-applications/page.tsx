import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";
import { reviewTeacherApplication } from "@/features/teachers/application-actions";
import { AdminTeachersNav } from "@/features/teachers/admin-teachers-nav";

export default async function TeacherApplications({ searchParams }: { searchParams: Promise<{ status?: string; filter?: string }> }) {
  const account = await getAccount();
  const client = ownerClient();
  if (!client || !account?.roles.some((role) => role === "owner" || role === "admin")) redirect("/account");
  const { status, filter } = await searchParams;
  const pendingOnly = filter === "pending";
  const query = client.from("teacher_applications").select("id, full_name, email, details, status, teacher_user_id")
    .order("created_at", { ascending: false }).limit(50);
  const { data, error } = await (pendingOnly ? query.eq("status", "pending") : query);
  return (
      <main id="main-content" className="dashboard-width space-y-4 pt-5 pb-10">
        <AdminTeachersNav active="applications" />
        <h2 className="text-lg font-bold">طلبات تقديم المدرسين</h2>
        <Link href={pendingOnly ? "/admin/teacher-applications" : "/admin/teacher-applications?filter=pending"}
          className="inline-flex min-h-11 items-center text-primary underline">
          {pendingOnly ? "عرض كل الطلبات" : "عرض الطلبات المعلّقة"}
        </Link>
        {(status === "failed" || error) && <p role="alert" className="text-destructive">تعذّر تحميل الطلبات أو حفظ المراجعة.</p>}
        {data?.length ? data.map((application) => <article key={application.id} className="soft-card space-y-3 p-5">
          <h2 className="font-bold">{application.full_name}</h2>
          <p className="text-sm"><bdi>{application.email}</bdi> · <bdi>{application.details?.phone}</bdi></p>
          <p className="text-sm">{application.details?.qualification} · {application.details?.experience} سنوات خبرة</p>
          <p className="whitespace-pre-line text-sm leading-7">{application.details?.bio}</p>
          <p className="whitespace-pre-line text-sm leading-7">{application.details?.approach}</p>
          {typeof application.details?.video === "string" && application.details.video.startsWith("https://") &&
            <a className="inline-flex min-h-11 items-center text-primary underline" href={application.details.video} target="_blank" rel="noopener noreferrer">فيديو الشرح</a>}
          {application.status === "pending" ? <form className="flex gap-2" action={reviewTeacherApplication.bind(null, application.id)}>
            <button className="min-h-11 rounded-lg bg-primary px-4 text-primary-foreground" name="status" value="accepted">قبول الطلب</button>
            <button className="min-h-11 rounded-lg border px-4" name="status" value="rejected">رفض الطلب</button>
          </form> : application.status === "accepted" && !application.teacher_user_id
            ? <Link href={`/admin/teachers?application=${application.id}`} className="inline-flex min-h-11 items-center text-primary underline">استكمال إنشاء حساب المدرس</Link>
            : <p role="status">{application.status === "accepted" ? "تم قبول الطلب وإنشاء حساب المدرس" : "لم يُقبل الطلب"}</p>}
        </article>) : !error && <p className="text-muted-foreground">{pendingOnly ? "مفيش طلبات تقديم قيد المراجعة." : "مفيش طلبات تقديم حتى الآن."}</p>}
      </main>
  );
}
