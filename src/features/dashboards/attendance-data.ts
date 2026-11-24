import type { SupabaseClient } from "@supabase/supabase-js";

export type AttendanceRole = "teacher" | "student" | "parent";
export type AttendanceStatus = "present" | "absent" | "late";

type AttendanceSession = {
  id: string;
  group_id: string;
  title: string;
  starts_at: string;
};

type AttendanceMembership = {
  student_id: string;
  profiles: { display_name: string } | null;
};

type AttendanceRecord = {
  student_id: string;
  status: string;
};

type StudentAttendanceRecord = {
  session_id: string;
  student_id: string;
  status: string;
  class_sessions: { title: string; starts_at: string } | null;
  profiles: { display_name: string } | null;
};

export type AttendanceData =
  | { state: "empty" }
  | { state: "error" }
  | {
      state: "ready";
      sessions: AttendanceSession[];
      selected: AttendanceSession;
      memberships: AttendanceMembership[];
      recorded: Map<string, string>;
    }
  | { state: "ready"; records: StudentAttendanceRecord[] };

export function isAttendanceStatus(value: string): value is AttendanceStatus {
  return value === "present" || value === "absent" || value === "late";
}

export function isUuid(value: string) {
  return /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);
}

export async function loadAttendanceData(client: SupabaseClient, {
  role,
  userId,
  sessionId,
  now,
}: {
  role: AttendanceRole;
  userId: string;
  sessionId?: string;
  now: Date;
}): Promise<AttendanceData> {
  if (role === "teacher") {
    const { data, error } = await client.from("class_sessions").select("id,group_id,title,starts_at")
      .eq("teacher_id", userId).lte("starts_at", now.toISOString()).neq("status", "cancelled")
      .order("starts_at", { ascending: false }).limit(50);
    if (error) return { state: "error" };
    const sessions = (data ?? []) as AttendanceSession[];
    const selected = sessions.find(({ id }) => id === sessionId) ?? sessions[0];
    if (!selected) return { state: "empty" };
    const [memberships, attendance] = await Promise.all([
      client.from("group_members").select("student_id,profiles(display_name)").eq("group_id", selected.group_id),
      client.from("session_attendance").select("student_id,status").eq("session_id", selected.id),
    ]);
    if (memberships.error || attendance.error) return { state: "error" };
    return {
      state: "ready",
      sessions,
      selected,
      memberships: (memberships.data ?? []) as unknown as AttendanceMembership[],
      recorded: new Map(((attendance.data ?? []) as AttendanceRecord[]).map(({ student_id, status }) => [student_id, status])),
    };
  }

  const links = role === "parent"
    ? await client.from("guardian_links").select("student_id").eq("guardian_id", userId)
    : null;
  if (links?.error) return { state: "error" };
  const studentIds = role === "student" ? [userId] : links?.data?.map(({ student_id }) => student_id) ?? [];
  if (!studentIds.length) return { state: "empty" };
  const { data, error } = await client.from("session_attendance")
    .select("session_id,student_id,status,class_sessions(title,starts_at),profiles(display_name)")
    .in("student_id", studentIds).order("marked_at", { ascending: false }).limit(50);
  if (error) return { state: "error" };
  const records = (data ?? []) as unknown as StudentAttendanceRecord[];
  return records.length ? { state: "ready", records } : { state: "empty" };
}
