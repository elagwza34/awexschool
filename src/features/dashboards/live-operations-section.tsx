import { redirect } from "next/navigation";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";
import type { ReactNode } from "react";

type Role = "admin" | "teacher" | "student" | "parent";
type Section = "schedule" | "sessions" | "groups" | "finance" | "group-requests";
type GroupName = { name: string } | null;
type TeacherName = { full_name: string } | null;
type GroupRequest = {
  id: string; status: string; fee_minor: number; created_at: string; expires_at: string;
  reviewed_at: string | null; learning_groups: GroupName; student: { display_name: string } | null;
};
type TeacherEarning = {
  session_id: string; amount_minor: number; approved_at: string; paid_at: string | null;
  class_sessions: { title: string; teacher_profiles: TeacherName };
};
type ScheduleSession = {
  id: string; title: string; status: string; starts_at: string; ends_at: string;
  learning_groups: GroupName; teacher_profiles: TeacherName;
};

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

export async function LiveOperationsSection({ role, section, children }: { role: Role; section: Section; children?: ReactNode }) {
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
    const result = await client.from("group_join_requests")
      .select("id,status,fee_minor,created_at,expires_at,reviewed_at,learning_groups(name),student:profiles!group_join_requests_student_id_fkey(display_name)")
      .order("created_at", { ascending: false }).limit(50).overrideTypes<GroupRequest[], { merge: false }>();
    error = !!result.error;
    rows = result.data?.map((r) => ({
      id: r.id,
      title: [r.student?.display_name, r.learning_groups?.name].filter(Boolean).join(" · ") || "طلب انضمام",
      details: [
        statuses[r.status] ?? r.status,
        money.format(r.fee_minor / 100),
        `تقديم الطلب: ${time.format(new Date(r.created_at))}`,
        r.reviewed_at ? `المراجعة: ${time.format(new Date(r.reviewed_at))}` : `انتهاء الحجز: ${time.format(new Date(r.expires_at))}`,
      ].join(" · "),
    })) ?? [];
  } else if (section === "finance" && (role === "teacher" || role === "admin")) {
    let query = client.from("teacher_earnings").select("session_id,amount_minor,approved_at,paid_at,class_sessions!inner(teacher_id,title,teacher_profiles(full_name))")
      .order("approved_at", { ascending: false }).limit(50);
    if (role === "teacher") query = query.eq("class_sessions.teacher_id", account.user.id);
    const result = await query.overrideTypes<TeacherEarning[], { merge: false }>();
    error = !!result.error;
    rows = result.data?.map((r) => ({
      id: r.session_id,
      title: [r.class_sessions.title, role === "admin" ? r.class_sessions.teacher_profiles?.full_name : null].filter(Boolean).join(" · "),
      details: [
        money.format(r.amount_minor / 100),
        `الاعتماد: ${time.format(new Date(r.approved_at))}`,
        r.paid_at ? `الصرف: ${time.format(new Date(r.paid_at))}` : "في انتظار الصرف",
      ].join(" · "),
    })) ?? [];
  } else if (section === "schedule" || section === "sessions") {
    let query = client.from("class_sessions").select("id,title,status,starts_at,ends_at,learning_groups(name),teacher_profiles(full_name)").order("starts_at").limit(50);
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
    const result = await query.overrideTypes<ScheduleSession[], { merge: false }>();
    error ||= !!result.error;
    rows = result.data?.map((r) => ({
      id: r.id,
      title: r.title,
      details: [r.learning_groups?.name, r.teacher_profiles?.full_name, `${time.formatRange(new Date(r.starts_at), new Date(r.ends_at))}`, statuses[r.status] ?? r.status]
        .filter(Boolean).join(" · "),
    })) ?? [];
  }

  const Title = children ? "h2" : "h1";
  return <main id="main-content" className="dashboard-width space-y-4 py-5 lg:py-6">
    {children}
    <Title className={children ? "text-lg font-bold" : "text-2xl font-bold"}>{role === "admin" && section === "finance" ? "مستحقات المدرسين" : labels[section]}</Title>
    {error ? <p role="alert" className="soft-card p-5">تعذّر تحميل البيانات حاليًا.</p> : rows.length ? (
      <ul className="grid gap-3 sm:grid-cols-2">{rows.map((row) => <li key={row.id} className="soft-card p-4">
        <h2 className="font-bold">{row.title}</h2><p className="mt-1 text-sm text-muted-foreground">{row.details}</p>
      </li>)}</ul>
    ) : <p className="soft-card p-5 text-muted-foreground">{section === "schedule" ? "مفيش حصص مسجلة للأيام السبعة الجاية." : "مفيش سجلات هنا حاليًا."}</p>}
  </main>;
}
