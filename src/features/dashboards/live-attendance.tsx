import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthSubmit } from "@/features/auth/form-controls";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";
import { isPreviewFixtureEnvironment } from "@/lib/environment";
import { recordPortalAttendance } from "./live-attendance-actions";
import { loadAttendanceData, type AttendanceRole } from "./attendance-data";
import { attendancePreviewMembers, attendancePreviewRecords, attendancePreviewSessions } from "./attendance-fixtures";

const statuses = { present: "حاضر", absent: "غائب", late: "متأخر" };
const date = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" });
const labelFor = (status: keyof typeof statuses) => statuses[status] ?? "غير مسجل";

export async function LiveAttendance({ role, searchParams }: {
  role: AttendanceRole; searchParams: Promise<{ session?: string; message?: string }>;
}) {
  const [account, params] = await Promise.all([getAccount(), searchParams]);
  const client = ownerClient();
  if (!client || !account?.roles.includes(role)) redirect("/account");

  const result = await loadAttendanceData(client, {
    role,
    userId: account.user.id,
    sessionId: params.session,
    now: new Date(),
  });
  let body;
  if (result.state === "error") {
    const preview = isPreviewFixtureEnvironment();
    const selected = params.session
      ? attendancePreviewSessions.find(({ id }) => id === params.session)
      : attendancePreviewSessions[0];
    const recorded = new Map(attendancePreviewRecords.map(({ student_id, status }) => [student_id, status]));
    body = preview && role === "teacher" && selected ? <div className="space-y-3">
      <p role="status" className="soft-card p-4">بيانات تجريبية للمعاينة فقط.</p>
      <nav aria-label="الحصص" className="soft-card max-h-96 space-y-1 overflow-y-auto p-3">
        {attendancePreviewSessions.map((item) => <Link key={item.id} href={`/teacher/attendance?session=${item.id}`}
          aria-current={item.id === selected.id ? "page" : undefined}
          className="grid min-h-11 gap-1 rounded-lg p-3 hover:bg-accent aria-[current=page]:bg-accent">
          <span className="font-semibold">{item.title}</span><span className="text-sm text-muted-foreground">{date.format(new Date(item.starts_at))}</span>
        </Link>)}
      </nav>
      <section className="soft-card space-y-3 p-4">
        <h2 className="text-lg font-bold">{selected.title}</h2>
        {attendancePreviewMembers.map((member) => <div key={member.student_id} className="grid gap-1 border-t pt-3">
          <p className="font-semibold">{member.profiles.display_name}</p>
          <p className="text-sm text-muted-foreground">{labelFor(recorded.get(member.student_id) as keyof typeof statuses)}</p>
        </div>)}
      </section>
    </div> : <p role="alert" className="soft-card p-4">تعذّر تحميل الحضور.</p>;
  } else if (result.state === "empty") {
    body = <p className="soft-card p-4">{role === "teacher" ? "مفيش حصص سابقة متاحة لتسجيل الحضور." : "مفيش سجلات حضور متاحة حاليًا."}</p>;
  } else if ("sessions" in result) {
    const { sessions, selected, memberships, recorded } = result;
    body = <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <nav aria-label="الحصص" className="soft-card max-h-96 space-y-1 overflow-y-auto p-3">
        {sessions.map((item) => <Link key={item.id} href={`/teacher/attendance?session=${item.id}`}
          aria-current={item.id === selected.id ? "page" : undefined}
          className="grid min-h-11 gap-1 rounded-lg p-3 hover:bg-accent aria-[current=page]:bg-accent">
          <span className="font-semibold">{item.title}</span><span className="text-sm text-muted-foreground">{date.format(new Date(item.starts_at))}</span>
        </Link>)}
      </nav>
      <section className="soft-card space-y-3 p-4">
        <h2 className="text-lg font-bold">{selected.title}</h2>
        {params.message && <p role="status">{params.message === "saved" ? "تم حفظ الحضور." : "تعذّر حفظ الحضور."}</p>}
        {memberships.length ? memberships.map((member) => {
          const profile = member.profiles;
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
    </div>;
  } else {
    body = <ul className="grid gap-3 sm:grid-cols-2">
      {result.records.map((item) => <li key={`${item.session_id}-${item.student_id}`} className="soft-card p-4">
        <h2 className="font-bold">{item.class_sessions?.title}</h2>
        {role === "parent" && <p className="text-sm">{item.profiles?.display_name}</p>}
        <p className="mt-1 text-sm text-muted-foreground">{labelFor(item.status as keyof typeof statuses)}{item.class_sessions && ` · ${date.format(new Date(item.class_sessions.starts_at))}`}</p>
      </li>)}
    </ul>;
  }
  return <main id="main-content" className="dashboard-width space-y-4 py-5">
    <h1 className="text-2xl font-bold">الحضور والغياب</h1>{body}
  </main>;
}
