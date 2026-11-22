"use server";

import { redirect } from "next/navigation";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";

const destination = "/admin/teachers?view=assignments";
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export async function assignCourseTeacher(courseId: string, form: FormData) {
  const account = await getAccount();
  const client = ownerClient();
  if (!client || !account?.roles.some((role) => role === "admin" || role === "owner")) redirect("/account");
  const teacherId = String(form.get("teacher") ?? "");
  if (!uuid.test(courseId) || (teacherId && !uuid.test(teacherId))) redirect(`${destination}&message=failed`);
  if (teacherId) {
    const { data, error } = await client.from("profiles")
      .select("user_id,account_roles!inner(role_code),teacher_profiles!inner(user_id)")
      .eq("user_id", teacherId).eq("status", "active").eq("account_roles.role_code", "teacher").maybeSingle();
    if (error || !data) redirect(`${destination}&message=failed`);
  }
  const { data, error } = await client.from("courses").update({ teacher_id: teacherId || null })
    .eq("id", courseId).eq("status", "published").select("id").maybeSingle();
  redirect(`${destination}&message=${error || !data ? "failed" : "saved"}`);
}
