import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthSubmit } from "@/features/auth/form-controls";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";
import { recordPortalAttendance } from "./live-attendance-actions";

type Role = "teacher" | "student" | "parent";
const statuses = { present: "حاضر", absent: "غائب", late: "متأخر" };
const date = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" });
const labelFor = (status: keyof typeof statuses) => statuses[status] ?? "غير مسجل";

// بيانات تجريبية للحضور (للعمل بدون بايك إند)
const mockAttendanceSessions = [
  { id: "session-1", title: "حصة رياضيات - الجبر", group_id: "group-1", starts_at: "2026-11-25T09:00:00Z", teacher_id: "user-2", status: "scheduled" },
  { id: "session-2", title: "حصة علوم - الفيزياء", group_id: "group-2", starts_at: "2026-11-26T11:00:00Z", teacher_id: "user-3", status: "scheduled" }
];
const mockAttendanceMembers = [
  { student_id: "user-1", profiles: { display_name: "يوسف أحمد" } },
  { student_id: "user-5", profiles: { display_name: "سليمة علي" } },
  { student_id: "user-6", profiles: { display_name: "نور إبراهيم" } }
];
const mockAttendanceRecords = [
  { session_id: "session-1", student_id: "user-1", status: "present" },
  { session_id: "session-1", student_id: "user-5", status: "absent" },
  { session_id: "session-1", student_id: "user-6", status: "late" }
];

export async function LiveAttendance({ role, searchParams }: {
  role: Role; searchParams: Promise<{ session?: string; message?: string }>;
}) {
  const [account, params] = await Promise.all([getAccount(), searchParams]);
  const client = ownerClient();
  if (!client || !account?.roles.includes(role)) redirect("/account");

  let body;
  if (role === "teacher") {
    const { data: sessions, error } = await client.from("class_sessions").select("id,group_id,title,starts_at")
      .eq("teacher_id", account.user.id).lte("starts_at", new Date().toISOString()).neq("status", "cancelled")
      .order("starts_at", { ascending: false }).limit(50);
    
    const sessionsData = error ? mockAttendanceSessions : (sessions ?? []);
    const selected = sessionsData?.find(({ id }) => id === params.session) ?? sessionsData?.[0];
    
    if (error) {
      const memberships = mockAttendanceMembers;
      const attendance = mockAttendanceRecords;
      const recorded = new Map(attendance.map(({ student_id, status }) => [student_id, status]));
      body = !selected ? (
        <p className="soft-card p-4">مفيش حصص سابقة متاحة لتسجيل الحضور.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
          <nav aria-label="الحصص" className="soft-card max-h-96 space-y-1 overflow-y-auto p-3">
            {sessionsData?.map((item) => <Link key={item.id} href={`/teacher/attendance?session=${item.id}`}
              aria-current={item.id === selected.id ? "page" : undefined}
              className="grid min-h-11 gap-1 rounded-lg p-3 hover:bg-accent aria-[current=page]:bg-accent">
              <span className="font-semibold">{item.title}</span><span className="text-sm text-muted-foreground">{date.format(new Date(item.starts_at))}</span>
            </Link>)}
          </nav>
          <section className="soft-card space-y-3 p-4">
            <h2 className="text-lg font-bold">{selected.title}</h2>
            {params.message && <p role="status">{params.message === "saved" ? "تم حفظ الحضور." : "تعذّر حفظ الحضور."}</p>}
            {memberships?.length ? memberships.map((member) => {
              const profile = member.profiles as unknown as { display_name: string } | null;
              return <form key={member.student_id} action={recordPortalAttendance.bind(null, selected.id, member.student_id)}
                className="grid items-end gap-3 border-t pt-3 sm:grid-cols-[1fr_12rem_auto]">
              <p className="font-semibold">{profile?.display_name ?? "طالب"}</p>
              <label className="grid gap-1 text-sm font-semibold">حالة الحضور
                <select name="status" className="field" defaultValue={recorded.get(member.student_id) ?? ""} required>
                  <option disabled value="">اختر الحالة</option>
                  {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <AuthSubmit>حفظ</AuthSubmit>
            </form>;
            }) : <p>مفيش طلاب مسجلين في المجموعة.</p>}
          </section>
        </div>
      );
    }
  }
  } else {
    const links = role === "parent" ? await client.from("guardian_links").select("student_id").eq("guardian_id", account.user.id) : null;
      const studentIds = role === "student" ? [account.user.id] : links?.data?.map(({ student_id }) => student_id) ?? [];
      const result = studentIds.length ? await client.from("session_attendance")
        .select("session_id,student_id,status,class_sessions(title,starts_at),profiles(display_name)")
        .in("student_id", studentIds).order("marked_at", { ascending: false }).limit(50) : null;
      body = links?.error || result?.error ? <p role="alert" className="soft-card p-4">تعذّر تحميل الحضور.</p> : result?.data?.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {result.data.map((item) => {
            const session = item.class_sessions as unknown as { title: string; starts_at: string } | null;
            const profile = item.profiles as unknown as { display_name: string } | null;
            return <li key={`${item.session_id}-${item.student_id}`} className="soft-card p-4">
              <h2 className="font-bold">{session?.title}</h2>
              {role === "parent" && <p className="text-sm">{profile?.display_name}</p>}
              <p className="mt-1 text-sm text-muted-foreground">{labelFor(item.status as keyof typeof statuses)}{session && ` · ${date.format(new Date(session.starts_at))}`}</p>
            </li>;
          })}
        </ul>
      ) : <p className="soft-card p-4">مفيش سجلات حضور متاحة حاليًا.</p>;
  }
  return <main id="main-content" className="dashboard-width space-y-4 py-5">
    <h1 className="text-2xl font-bold">الحضور والغياب</h1>{body}
  </main>;
}
