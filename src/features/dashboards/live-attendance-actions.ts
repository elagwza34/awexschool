"use server";

import { redirect } from "next/navigation";
import { getAccount, sessionClient } from "@/features/auth/supabase-server";
import { applyAttendanceRecord, isAttendanceStatus, isUuid } from "./attendance-data";

export async function recordPortalAttendance(sessionId: string, studentId: string, form: FormData) {
  const account = await getAccount();
  if (!account?.roles.includes("teacher")) redirect("/account");
  const client = await sessionClient(true);
  if (!client) redirect("/account");
  const status = String(form.get("status") ?? "");
  if (!isUuid(sessionId) || !isUuid(studentId) || !isAttendanceStatus(status)) {
    redirect("/teacher/attendance?message=failed");
  }
  const outcome = await applyAttendanceRecord(client, sessionId, studentId, status);
  redirect(`/teacher/attendance?session=${sessionId}&message=${outcome === "saved" ? "saved" : "failed"}`);
}
