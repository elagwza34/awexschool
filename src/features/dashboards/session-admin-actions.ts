"use server";

import { revalidatePath } from "next/cache";
import { getAccount, sessionClient } from "@/features/auth/supabase-server";
import { isUuid } from "./attendance-data";
import { parseCairoSessionStart } from "./session-time";

const messages: Record<string, string> = {
  session_conflict: "هذا الموعد يتعارض مع حصة للمجموعة أو المدرس.",
  session_history_locked: "يمكن تعديل أو إلغاء الحصص المجدولة التي لم تبدأ فقط.",
  session_teacher_group: "اختر مجموعة نشطة والمدرس المعيّن لها.",
  session_roster_locked: "لا يمكن تغيير المجموعة أو المدرس بعد تثبيت قائمة الحضور.",
};

export async function manageClassSession(id: string | null, _previous: string, form: FormData) {
  const account = await getAccount();
  const client = await sessionClient(true);
  if (!client || !account?.roles.some((role) => role === "admin" || role === "owner")) {
    return "لا تملك صلاحية إدارة الحصص.";
  }
  const cancel = form.get("operation") === "cancel";
  const group = String(form.get("group") ?? "");
  const teacher = String(form.get("teacher") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const startsAt = parseCairoSessionStart(String(form.get("starts") ?? ""));
  const duration = Number(form.get("duration"));
  if ((id !== null && !isUuid(id)) || (cancel && !id) ||
      (!cancel && (!isUuid(group) || !isUuid(teacher) || !startsAt || title.length < 2 || title.length > 160 ||
        !Number.isInteger(duration) || duration < 15 || duration > 480))) {
    return "راجع المجموعة والمدرس وعنوان الحصة والموعد والمدة.";
  }
  const { data, error } = await client.rpc("manage_class_session", {
    p_session: id, p_group: cancel ? null : group, p_teacher: cancel ? null : teacher,
    p_title: cancel ? null : title, p_starts_at: cancel ? null : startsAt,
    p_duration: cancel ? null : duration, p_cancel: cancel,
  });
  if (error || typeof data !== "string" || !isUuid(data)) {
    return messages[error?.message ?? ""] ?? "تعذّر حفظ الحصة. حاول مرة أخرى.";
  }
  for (const path of ["/admin/schedule", "/teacher/sessions", "/teacher/schedule", "/student/schedule", "/parent/schedule"]) {
    revalidatePath(path);
  }
  return cancel ? "تم إلغاء الحصة." : "تم حفظ الحصة.";
}
