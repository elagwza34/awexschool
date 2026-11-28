"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  getAccount,
  sessionClient,
} from "@/features/auth/supabase-server";

import {
  applyAttendanceRecord,
  isAttendanceStatus,
  isUuid,
} from "./attendance-data";

export async function recordPortalAttendance(
  sessionId: string,
  studentId: string,
  form: FormData
) {
  const account = await getAccount();

  if (!account?.roles.includes("teacher")) {
    redirect("/account");
  }

  const status = String(form.get("status") ?? "");

  // Validate submitted data.
  if (
    !isUuid(sessionId) ||
    !isUuid(studentId) ||
    !isAttendanceStatus(status)
  ) {
    redirect("/teacher/attendance?message=failed");
  }

  const client = await sessionClient(true);

  if (!client) {
    redirect("/account");
  }

  let saved = false;

  try {
    const outcome = await applyAttendanceRecord(
      client,
      sessionId,
      studentId,
      status
    );

    saved = outcome === "saved";
  } catch (error) {
    console.error("[Attendance] Save failed:", error);
  }

  // Refresh attendance after successful persistence.
  if (saved) {
    revalidatePath("/teacher/attendance");
    revalidatePath("/student/attendance");
    revalidatePath("/parent/attendance");
  }

  redirect(
    `/teacher/attendance?session=${encodeURIComponent(sessionId)}&message=${saved ? "saved" : "failed"}`
  );
}