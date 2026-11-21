import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/features/dashboards/portal-shell";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";
import { reviewTeacherApplication } from "@/features/teachers/application-actions";

export default async function TeacherApplications({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const account = await getAccount();
  const client = ownerClient();
  if (!client || !account?.roles.some((role) => role === "owner" || role === "admin")) redirect("/account");
  const [{ data, error }, { status }] = await Promise.all([
    client.from("teacher_applications").select("id, full_name, email, details, status").order("created_at", { ascending: false }).limit(50),
    searchParams,
  ]);
  return (
    <PortalShell role="admin">
      <main id="main-content" className="container-shell space-y-4 pt-28 pb-10">
        <h1 className="text-2xl font-bold">طلبات تقديم المدرسين</h1>
        <Link href="/admin/catalog" className="inline-flex min-h-11 items-center text-primary underline">إدارة المقررات</Link>
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
          </form> : <p role="status">{application.status === "accepted" ? "تم قبول الطلب" : "لم يُقبل الطلب"}</p>}
        </article>) : !error && <p className="text-muted-foreground">مفيش طلبات تقديم حتى الآن.</p>}
      </main>
    </PortalShell>
  );
}
