import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthSubmit } from "@/features/auth/form-controls";
import {
  getAccount,
  sessionClient,
} from "@/features/auth/supabase-server";
import { isPreviewFixtureEnvironment } from "@/lib/environment";
import { recordPortalAttendance } from "./live-attendance-actions";

import { loadAttendanceData, type AttendanceRole } from "./attendance-data.ts";

const statuses: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
};

const date = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Cairo",
});

const labelFor = (status?: string) =>
  statuses[status ?? ""] ?? "غير مسجل";

function attendanceError() {
  return (
    <p role="alert" className="soft-card p-4">
      تعذّر تحميل الحضور. برجاء المحاولة مرة أخرى.
    </p>
  );
}

function previewAttendance() {
  return (
    <section className="soft-card space-y-4 p-4">
      <p
        role="status"
        className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3"
      >
        بيانات تجريبية للمعاينة فقط.
        لا يمكن حفظ هذه البيانات.
      </p>

      <h2 className="text-lg font-bold">
        حصة رياضيات - الجبر
      </h2>

      <ul className="space-y-3">
        {[
          { name: "يوسف أحمد", status: "present" },
          { name: "سليمة علي", status: "absent" },
          { name: "نور إبراهيم", status: "late" },
        ].map((student) => (
          <li
            key={student.name}
            className="flex items-center justify-between gap-3 border-t pt-3"
          >
            <span>{student.name}</span>
            <span>{labelFor(student.status)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function LiveAttendance({
  role,
  searchParams,
}: {
  role: AttendanceRole;
  searchParams: Promise<{
    session?: string;
    message?: string;
  }>;
}) {
  const [account, params] = await Promise.all([
    getAccount(),
    searchParams,
  ]);

  if (!account?.roles.includes(role)) {
    redirect("/account");
  }

  const client = await sessionClient();
  const data = client
    ? await loadAttendanceData(client, {
        role,
        userId: account.user.id,
        sessionId: params.session,
        now: new Date(),
      }).catch(() => ({ state: "error" as const }))
    : { state: "error" as const };

  let body;
  if (data.state === "error") {
    body = (
      <>
        {attendanceError()}
        {client && role === "teacher" && isPreviewFixtureEnvironment() && previewAttendance()}
      </>
    );
  } else if (data.state === "empty") {
    body = (
      <p className="soft-card p-4">
        {role === "teacher"
          ? "لا توجد حصص متاحة لتسجيل الحضور."
          : "لا توجد سجلات حضور متاحة حاليًا."}
      </p>
    );
  } else if ("selected" in data) {
    const { memberships, recorded, selected, sessions: sessionsData } = data;
    const summary = [
      {
        label: "إجمالي الطلاب",
        value: memberships.length,
      },
      {
        label: "حاضر",
        value: memberships.filter(
          (member) =>
            recorded.get(member.student_id) === "present"
        ).length,
      },
      {
        label: "غائب",
        value: memberships.filter(
          (member) =>
            recorded.get(member.student_id) === "absent"
        ).length,
      },
      {
        label: "متأخر",
        value: memberships.filter(
          (member) =>
            recorded.get(member.student_id) === "late"
        ).length,
      },
      {
        label: "غير مسجل",
        value: memberships.filter(
          (member) =>
            !recorded.has(member.student_id)
        ).length,
      },
    ];

    body = (
      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <nav
          aria-label="الحصص"
          className="soft-card max-h-96 space-y-1 overflow-y-auto p-3"
        >
          {sessionsData.map((item) => (
            <Link
              key={item.id}
              href={`/teacher/attendance?session=${encodeURIComponent(item.id)}`}
              aria-current={
                item.id === selected.id
                  ? "page"
                  : undefined
              }
              className="grid min-h-11 gap-1 rounded-lg p-3 hover:bg-accent aria-[current=page]:bg-accent"
            >
              <span className="font-semibold">
                {item.title}
              </span>

              <span className="text-sm text-muted-foreground">
                {date.format(
                  new Date(item.starts_at)
                )}
              </span>
            </Link>
          ))}
        </nav>

        <section className="soft-card space-y-4 p-4">
          <h2 className="text-lg font-bold">
            {selected.title}
          </h2>

          <p className="text-sm text-muted-foreground">
            {date.format(
              new Date(selected.starts_at)
            )}
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {summary.map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg border p-3"
              >
                <p className="text-sm text-muted-foreground">
                  {label}
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {value.toLocaleString("ar-EG")}
                </p>
              </div>
            ))}
          </div>

          {params.message && (
            <p role="status">
              {params.message === "saved"
                ? "تم حفظ الحضور."
                : "تعذّر حفظ الحضور."}
            </p>
          )}

          {memberships.length ? (
            memberships.map((member) => (
              <form
                key={`${selected.id}-${member.student_id}-${recorded.get(member.student_id) ?? "unrecorded"}`}
                action={recordPortalAttendance.bind(
                  null,
                  selected.id,
                  member.student_id
                )}
                className="grid items-end gap-3 border-t pt-3 sm:grid-cols-[1fr_12rem_auto]"
              >
                <div>
                  <p className="font-semibold">
                    {member.profiles?.display_name ?? "طالب"}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {labelFor(
                      recorded.get(member.student_id)
                    )}
                  </p>
                </div>

                <label className="grid gap-1 text-sm font-semibold">
                  حالة الحضور

                  <select
                    name="status"
                    className="field"
                    defaultValue={
                      recorded.get(member.student_id) ?? ""
                    }
                    required
                  >
                    <option disabled value="">
                      اختر الحالة
                    </option>

                    {Object.entries(statuses).map(
                      ([value, label]) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <AuthSubmit>حفظ</AuthSubmit>
              </form>
            ))
          ) : (
            <p>
              لا توجد قائمة طلاب محفوظة لهذه الحصة.
            </p>
          )}
        </section>
      </div>
    );
  } else {
    body = (
      <ul className="grid gap-3 sm:grid-cols-2">
        {data.records.map((item) => {
          const { class_sessions: session, profiles: profile } = item;

          return (
            <li
              key={`${item.session_id}-${item.student_id}`}
              className="soft-card space-y-2 p-4"
            >
              <h2 className="font-bold">
                {session?.title ?? "حصة دراسية"}
              </h2>

              {role === "parent" && (
                <p className="text-sm">
                  {profile?.display_name ?? "طالب"}
                </p>
              )}

              <p className="text-sm font-semibold">
                {labelFor(item.status)}
              </p>

              {session && (
                <p className="text-sm text-muted-foreground">
                  {date.format(
                    new Date(session.starts_at)
                  )}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <main
      id="main-content"
      className="dashboard-width space-y-4 py-5"
    >
      <h1 className="text-2xl font-bold">
        الحضور والغياب
      </h1>

      {body}
    </main>
  );
}