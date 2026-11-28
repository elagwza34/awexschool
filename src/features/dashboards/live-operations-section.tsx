import { redirect } from "next/navigation";
import {
  getAccount,
  ownerClient,
  sessionClient,
} from "@/features/auth/supabase-server";
import type { ReactNode } from "react";
import { activeLinkedStudentIds } from "./guardian-learner-scope";

type Role = "admin" | "teacher" | "student" | "parent";

type Section =
  | "schedule"
  | "sessions"
  | "groups"
  | "finance"
  | "group-requests";

type GroupName = { name: string } | null;
type TeacherName = { full_name: string } | null;

type GroupRequest = {
  id: string;
  status: string;
  fee_minor: number;
  created_at: string;
  expires_at: string;
  reviewed_at: string | null;
  learning_groups: GroupName;
  student: { display_name: string } | null;
};

type TeacherEarning = {
  session_id: string;
  amount_minor: number;
  approved_at: string;
  paid_at: string | null;
  class_sessions: {
    title: string;
    teacher_profiles: TeacherName;
  };
};

type ScheduleSession = {
  id: string;
  title: string;
  status: string;
  starts_at: string;
  ends_at: string;
  learning_groups: GroupName;
  teacher_profiles: TeacherName;
};

const labels: Record<Section, string> = {
  schedule: "الجدول الأسبوعي",
  sessions: "الحصص والاجتماعات",
  groups: "مجموعاتي وطلابي",
  finance: "المستحقات",
  "group-requests": "طلبات انضمام المجموعات",
};

const statuses: Record<string, string> = {
  scheduled: "مجدولة",
  completed: "مكتملة",
  cancelled: "ملغاة",
  reserved: "محجوز",
  expired: "منتهي",
  paid: "مدفوع",
  approved: "مقبول",
  rejected: "مرفوض",
};

const allowedSections: Record<Role, Section[]> = {
  admin: [
    "schedule",
    "sessions",
    "finance",
    "group-requests",
  ],
  teacher: [
    "schedule",
    "sessions",
    "groups",
    "finance",
  ],
  student: ["schedule", "sessions"],
  parent: ["schedule", "sessions"],
};

const time = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Cairo",
});

const money = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
});

export async function LiveOperationsSection({
  role,
  section,
  children,
}: {
  role: Role;
  section: Section;
  children?: ReactNode;
}) {
  const account = await getAccount();
  const client = ownerClient();

  // ==========================================
  // AUTHENTICATION AND AUTHORIZATION
  // ==========================================

  if (
    !client ||
    !account?.roles.some(
      (item) =>
        item === role ||
        (role === "admin" && item === "owner")
    )
  ) {
    redirect("/account");
  }

  if (!allowedSections[role].includes(section)) {
    redirect("/account");
  }

  const allowedRoles =
    role === "admin"
      ? ["admin", "owner"]
      : [role];

  const [profileCheck, roleCheck] = await Promise.all([
    client
      .from("profiles")
      .select("user_id")
      .eq("user_id", account.user.id)
      .eq("status", "active")
      .maybeSingle(),

    client
      .from("account_roles")
      .select("role_code")
      .eq("user_id", account.user.id)
      .in("role_code", allowedRoles),
  ]);

  if (
    profileCheck.error ||
    roleCheck.error ||
    !profileCheck.data ||
    !roleCheck.data?.length
  ) {
    redirect("/account");
  }

  let error = false;

  let rows: {
    id: string;
    title: string;
    details: string;
  }[] = [];

  // ==========================================
  // TEACHER LEARNING GROUPS
  // ==========================================

  if (section === "groups" && role === "teacher") {
    const result = await client
      .from("learning_groups")
      .select("id,name,capacity,active")
      .eq("teacher_id", account.user.id)
      .order("name")
      .limit(50);

    error = !!result.error;

    rows =
      result.data?.map((r) => ({
        id: r.id,
        title: r.name,
        details: `${
          r.active ? "نشطة" : "غير نشطة"
        } · السعة ${r.capacity}`,
      })) ?? [];
  }

  // ==========================================
  // ADMIN GROUP JOIN REQUESTS
  // ==========================================

  else if (
    section === "group-requests" &&
    role === "admin"
  ) {
    const result = await client
      .from("group_join_requests")
      .select(
        `
        id,
        status,
        fee_minor,
        created_at,
        expires_at,
        reviewed_at,
        learning_groups(name),
        student:profiles!group_join_requests_student_id_fkey(display_name)
        `
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(50)
      .overrideTypes<
        GroupRequest[],
        { merge: false }
      >();

    error = !!result.error;

    rows =
      result.data?.map((r) => ({
        id: r.id,

        title:
          [
            r.student?.display_name,
            r.learning_groups?.name,
          ]
            .filter(Boolean)
            .join(" · ") || "طلب انضمام",

        details: [
          statuses[r.status] ?? r.status,

          money.format(r.fee_minor / 100),

          `تقديم الطلب: ${time.format(
            new Date(r.created_at)
          )}`,

          r.reviewed_at
            ? `المراجعة: ${time.format(
                new Date(r.reviewed_at)
              )}`
            : `انتهاء الحجز: ${time.format(
                new Date(r.expires_at)
              )}`,
        ].join(" · "),
      })) ?? [];
  }

  // ==========================================
  // TEACHER AND ADMIN FINANCE
  // ==========================================

  else if (
    section === "finance" &&
    (role === "teacher" || role === "admin")
  ) {
    let query = client
      .from("teacher_earnings")
      .select(
        `
        session_id,
        amount_minor,
        approved_at,
        paid_at,
        class_sessions!inner(
          teacher_id,
          title,
          teacher_profiles(full_name)
        )
        `
      )
      .order("approved_at", {
        ascending: false,
      })
      .limit(50);

    if (role === "teacher") {
      query = query.eq(
        "class_sessions.teacher_id",
        account.user.id
      );
    }

    const result = await query.overrideTypes<
      TeacherEarning[],
      { merge: false }
    >();

    error = !!result.error;

    rows =
      result.data?.map((r) => ({
        id: r.session_id,

        title: [
          r.class_sessions.title,
          role === "admin"
            ? r.class_sessions.teacher_profiles
                ?.full_name
            : null,
        ]
          .filter(Boolean)
          .join(" · "),

        details: [
          money.format(r.amount_minor / 100),

          `الاعتماد: ${time.format(
            new Date(r.approved_at)
          )}`,

          r.paid_at
            ? `الصرف: ${time.format(
                new Date(r.paid_at)
              )}`
            : "في انتظار الصرف",
        ].join(" · "),
      })) ?? [];
  }

  // ==========================================
  // SCHEDULE AND CLASS SESSIONS
  // ==========================================

  else if (
    section === "schedule" ||
    section === "sessions"
  ) {
    let query = client
      .from("class_sessions")
      .select(
        `
        id,
        title,
        status,
        starts_at,
        ends_at,
        learning_groups(name),
        teacher_profiles(full_name)
        `
      )
      .order("starts_at")
      .limit(50);

    // Upcoming seven days.
    if (section === "schedule") {
      const now = new Date();

      const nextWeek = new Date(
        now.getTime() + 7 * 86400_000
      );

      query = query
        .gte("starts_at", now.toISOString())
        .lt("starts_at", nextWeek.toISOString());
    }

    // Teachers can access their own sessions only.
    if (role === "teacher") {
      query = query.eq(
        "teacher_id",
        account.user.id
      );
    }

    // ==========================================
    // STUDENT AND GUARDIAN ACCESS
    // ==========================================

    let canReadSessions = true;

    if (role === "student" || role === "parent") {
      let studentIds: string[] = [];

      if (role === "student") {
        studentIds = [account.user.id];
      }

      if (role === "parent") {
        const guardianClient = await sessionClient();
        if (guardianClient) {
          const scope = await activeLinkedStudentIds(guardianClient, account.user.id);
          error ||= scope.error;
          studentIds = scope.ids;
        } else {
          error = true;
        }
      }

      // Retrieve group memberships for authorized
      // students only.

      const memberships =
        !error && studentIds.length
          ? await client
              .from("group_members")
              .select("group_id")
              .in("student_id", studentIds)
          : null;

      error ||= !!memberships?.error;

      const groupIds = [
        ...new Set(
          (memberships?.data ?? []).map(
            (membership) => membership.group_id
          )
        ),
      ];

      // Never execute an unrestricted query when
      // authorized group IDs are unavailable.

      if (error || !groupIds.length) {
        canReadSessions = false;
      } else {
        query = query.in("group_id", groupIds);
      }
    }

    if (canReadSessions && !error) {
      const result = await query.overrideTypes<
        ScheduleSession[],
        { merge: false }
      >();

      error = !!result.error;

      rows =
        result.data?.map((r) => ({
          id: r.id,
          title: r.title,

          details: [
            r.learning_groups?.name,

            r.teacher_profiles?.full_name,

            time.formatRange(
              new Date(r.starts_at),
              new Date(r.ends_at)
            ),

            statuses[r.status] ?? r.status,
          ]
            .filter(Boolean)
            .join(" · "),
        })) ?? [];
    }
  }

  // ==========================================
  // USER INTERFACE
  // ==========================================

  const Title = children ? "h2" : "h1";
  const RowTitle = children ? "h3" : "h2";

  return (
    <main
      id="main-content"
      className="dashboard-width space-y-4 py-5 lg:py-6"
    >
      {children}

      <Title
        className={
          children
            ? "text-lg font-bold"
            : "text-2xl font-bold"
        }
      >
        {role === "admin" &&
        section === "finance"
          ? "مستحقات المدرسين"
          : labels[section]}
      </Title>

      {error ? (
        <p
          role="alert"
          className="soft-card p-5"
        >
          تعذّر تحميل البيانات حاليًا.
          برجاء المحاولة مرة أخرى.
        </p>
      ) : rows.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="soft-card p-4"
            >
              <RowTitle className="font-bold">
                {row.title}
              </RowTitle>

              <p className="mt-1 text-sm text-muted-foreground">
                {row.details}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="soft-card p-5 text-muted-foreground">
          {section === "schedule"
            ? "لا توجد حصص مسجلة خلال الأيام السبعة القادمة."
            : "لا توجد سجلات متاحة حاليًا."}
        </p>
      )}
    </main>
  );
}