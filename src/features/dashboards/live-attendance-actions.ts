"use server";

import { redirect } from "next/navigation";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";
import { isAttendanceStatus, isUuid } from "./attendance-data";
import { mutationOutcome } from "@/lib/mutation-result";

export async function recordPortalAttendance(sessionId: string, studentId: string, form: FormData) {
  const account = await getAccount();
  const client = ownerClient();
  if (!client || !account?.roles.includes("teacher")) redirect("/account");
  const status = String(form.get("status") ?? "");
  if (!isUuid(sessionId) || !isUuid(studentId) || !isAttendanceStatus(status)) {
    redirect("/teacher/attendance?message=failed");
  }
  const session = await client.from("class_sessions").select("group_id")
    .eq("id", sessionId).eq("teacher_id", account.user.id)
    .lte("starts_at", new Date().toISOString()).neq("status", "cancelled").maybeSingle();
  const membership = session.data && await client.from("group_members").select("student_id")
    .eq("group_id", session.data.group_id).eq("student_id", studentId).maybeSingle();
  if (session.error || !session.data || membership?.error || !membership?.data) redirect("/teacher/attendance?message=failed");

  const result = await client.from("session_attendance").upsert({
    session_id: sessionId, student_id: studentId, status, marked_at: new Date().toISOString(),
  }, { onConflict: "session_id,student_id" }).select("session_id,student_id").maybeSingle();
  redirect(`/teacher/attendance?session=${sessionId}&message=${mutationOutcome(result) === "saved" ? "saved" : "failed"}`);
}
