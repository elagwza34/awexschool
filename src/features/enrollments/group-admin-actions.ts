"use server";

import { redirect } from "next/navigation";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const errors: Record<string, string> = {
  group_capacity: "السعة أقل من عدد الطلاب بعد الإضافة. زوّد السعة أو قلّل عدد الطلاب المختارين.",
  group_course: "اختار مقرر منشور.",
  group_teacher: "اختار مدرس عنده حساب نشط وملف مدرس.",
  group_students: "طالب من المختارين حسابه غير نشط. راجع اختيار الطلاب.",
  group_missing: "المجموعة دي غير متاحة.",
};

export async function saveLearningGroup(groupId: string | null, _previous: string, form: FormData): Promise<string> {
  const account = await getAccount();
  const client = ownerClient();
  if (!client || !account?.roles.some((role) => role === "owner" || role === "admin")) redirect("/account");

  const name = String(form.get("name") ?? "").trim();
  const course = String(form.get("course") ?? "");
  const teacher = String(form.get("teacher") ?? "");
  const capacity = Number(form.get("capacity"));
  const fee = String(form.get("fee") ?? "");
  const weekday = Number(form.get("weekday"));
  const time = String(form.get("time") ?? "");
  const students = [...new Set(form.getAll("students").map(String))];
  if (name.length < 2 || name.length > 160 || !uuid.test(course) || !uuid.test(teacher) ||
      (groupId !== null && !uuid.test(groupId)) || !Number.isInteger(capacity) || capacity < 1 || capacity > 500 ||
      !/^\d{1,6}(?:\.\d{1,2})?$/.test(fee) || !Number.isInteger(weekday) || weekday < 1 || weekday > 7 ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) || students.length > 500 || students.some((id) => !uuid.test(id))) {
    return "راجع اسم المجموعة والمقرر والمدرس والسعة والسعر وموعد الحصة.";
  }

  const { data, error } = await client.rpc("save_learning_group", {
    p_actor: account.user.id, p_group: groupId, p_course: course, p_teacher: teacher, p_name: name,
    p_capacity: capacity, p_fee_minor: Math.round(Number(fee) * 100), p_weekday: weekday,
    p_time: time, p_active: form.get("active") === "on", p_students: students,
  });
  if (error || !data) return errors[error?.message ?? ""] ?? "تعذّر حفظ المجموعة. حاول مرة تانية.";
  redirect(`/admin/group-requests?saved=${data}`);
}
