import { redirect } from "next/navigation";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";

type Role = "admin" | "teacher" | "student" | "parent";
type Section = "schedule" | "sessions" | "groups" | "finance" | "group-requests";

const labels: Record<Section, string> = {
  schedule: "الجدول الأسبوعي",
  sessions: "الحصص والاجتماعات",
  groups: "مجموعاتي وطلابي",
  finance: "المستحقات",
  "group-requests": "طلبات انضمام المجموعات",
};
const statuses: Record<string, string> = {
  scheduled: "مجدولة", completed: "مكتملة", cancelled: "ملغاة",
  reserved: "محجوز", expired: "منتهي", paid: "مدفوع", approved: "مقبول", rejected: "مرفوض",
};
const time = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" });
const money = new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" });

export async function LiveOperationsSection({ role, section }: { role: Role; section: Section }) {
  const account = await getAccount();
  const client = ownerClient();
  if (!client || !account?.roles.some((item) => item === role || (role === "admin" && item === "owner"))) redirect("/account");

  let error = false;
  let rows: { id: string; title: string; details: string }[] = [];
  if (section === "groups" && role === "teacher") {
    const result = await client.from("learning_groups").select("id,name,capacity,active").eq("teacher_id", account.user.id).order("name").limit(50);
    error = !!result.error;
    rows = result.data?.map((r) => ({ id: r.id, title: r.name, details: `${r.active ? "نشطة" : "غير نشطة"} · السعة ${r.capacity}` })) ?? [];
  } else if (section === "group-requests" && role === "admin") {
    const result = await client.from("group_join_requests").select("id,status,fee_minor,created_at").order("created_at", { ascending: false }).limit(50);
    error = !!result.error;
    rows = result.data?.map((r) => ({ id: r.id, title: statuses[r.status] ?? r.status, details: `${money.format(r.fee_minor / 100)} · ${time.format(new Date(r.created_at))}` })) ?? [];
  } else if (section === "finance" && (role === "teacher" || role === "admin")) {
    let query = client.from("teacher_earnings").select("session_id,amount_minor,approved_at,paid_at,class_sessions!inner(teacher_id)")
      .order("approved_at", { ascending: false }).limit(50);
    if (role === "teacher") query = query.eq("class_sessions.teacher_id", account.user.id);
    const result = await query;
    error = !!result.error;
    rows = result.data?.map((r) => ({ id: r.session_id, title: money.format(r.amount_minor / 100), details: `${r.paid_at ? "تم الصرف" : "معتمدة في انتظار الصرف"} · ${time.format(new Date(r.approved_at))}` })) ?? [];
  } else if (section === "schedule" || section === "sessions") {
    let query = client.from("class_sessions").select("id,title,status,starts_at").order("starts_at").limit(50);
    if (section === "schedule") {
      const now = new Date();
      query = query.gte("starts_at", now.toISOString()).lt("starts_at", new Date(now.getTime() + 7 * 86400_000).toISOString());
    }
    if (role === "teacher") query = query.eq("teacher_id", account.user.id);
    if (role === "student" || role === "parent") {
      let studentIds = [account.user.id];
      if (role === "parent") {
        const links = await client.from("guardian_links").select("student_id").eq("guardian_id", account.user.id);
        error = !!links.error;
        studentIds = links.data?.map((link) => link.student_id) ?? [];
      }
      const memberships = studentIds.length ? await client.from("group_members").select("group_id").in("student_id", studentIds) : null;
      error ||= !!memberships?.error;
      const groupIds = [...new Set(memberships?.data?.map((membership) => membership.group_id) ?? [])];
      if (!groupIds.length) query = query.limit(0);
      else query = query.in("group_id", groupIds);
    }
    const result = await query;
    error ||= !!result.error;
    rows = result.data?.map((r) => ({ id: r.id, title: r.title, details: `${time.format(new Date(r.starts_at))} · ${statuses[r.status] ?? r.status}` })) ?? [];
  }

  return <main id="main-content" className="dashboard-width space-y-4 py-5 lg:py-6">
    <h1 className="text-2xl font-bold">{labels[section]}</h1>
    {error ? <p role="alert" className="soft-card p-5">تعذّر تحميل البيانات حاليًا.</p> : rows.length ? (
      <ul className="grid gap-3 sm:grid-cols-2">{rows.map((row) => <li key={row.id} className="soft-card p-4">
        <h2 className="font-bold">{row.title}</h2><p className="mt-1 text-sm text-muted-foreground">{row.details}</p>
      </li>)}</ul>
    ) : <p className="soft-card p-5 text-muted-foreground">{section === "schedule" ? "مفيش حصص مسجلة للأيام السبعة الجاية." : "مفيش سجلات هنا حاليًا."}</p>}
  </main>;
}
