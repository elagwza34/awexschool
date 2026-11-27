import type { SupabaseClient } from "@supabase/supabase-js";
import type { MutationOutcome } from "../../lib/mutation-result.ts";
import { activeLinkedStudentIds } from "./guardian-learner-scope.ts";

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

type RosterEntry = {
  student_id: string;
  display_name: string;
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

export async function applyAttendanceRecord(
  client: SupabaseClient,
  sessionId: string,
  studentId: string,
  status: AttendanceStatus,
): Promise<MutationOutcome> {
  const { data, error } = await client.rpc("record_session_attendance", {
    p_session: sessionId,
    p_student: studentId,
    p_status: status,
  });
  if (error) return "failed";
  return data === true ? "saved" : "not_found";
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
    const selected = sessionId ? sessions.find(({ id }) => id === sessionId) : sessions[0];
    if (sessionId && !selected) return { state: "error" };
    if (!selected) return { state: "empty" };
    const snapshot = await client.from("session_roster_snapshots").select("session_id")
      .eq("session_id", selected.id).maybeSingle();
    if (snapshot.error || !snapshot.data) return { state: "error" };
    const [entries, attendance] = await Promise.all([
      client.from("session_roster_entries").select("student_id,display_name")
        .eq("session_id", selected.id).order("student_id", { ascending: true }),
      client.from("session_attendance").select("student_id,status").eq("session_id", selected.id),
    ]);
    if (entries.error || attendance.error) return { state: "error" };
    const memberships = ((entries.data ?? []) as RosterEntry[]).map(({ student_id, display_name }) => ({
      student_id,
      profiles: { display_name },
    }));
    return {
      state: "ready",
      sessions,
      selected,
      memberships,
      recorded: new Map(((attendance.data ?? []) as AttendanceRecord[]).map(({ student_id, status }) => [student_id, status])),
    };
  }

  let studentIds = role === "student" ? [userId] : [];
  if (role === "parent") {
    const scope = await activeLinkedStudentIds(client, userId);
    if (scope.error) return { state: "error" };
    studentIds = scope.ids;
  }
  if (!studentIds.length) return { state: "empty" };
  const { data, error } = await client.from("session_attendance")
    .select("session_id,student_id,status,class_sessions(title,starts_at),profiles(display_name)")
    .in("student_id", studentIds).order("marked_at", { ascending: false }).limit(50);
  if (error) return { state: "error" };
  const records = (data ?? []) as unknown as StudentAttendanceRecord[];
  return records.length ? { state: "ready", records } : { state: "empty" };
}
