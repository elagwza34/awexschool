"use server";

import { redirect } from "next/navigation";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";

const field = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function submitTeacherApplication(_previous: string, form: FormData) {
  const client = ownerClient();
  if (!client) return "تقديم المدرسين غير متاح حاليًا.";
  const full_name = field(form, "fullName");
  const email = field(form, "email").toLowerCase();
  const subject_id = field(form, "subject");
  const phone = field(form, "phone");
  const qualification = field(form, "qualification");
  const governorate = field(form, "governorate");
  const experience = field(form, "experience");
  const bio = field(form, "bio");
  const approach = field(form, "approach");
  const video = field(form, "video");
  const gradeIds = [...new Set(form.getAll("grades").map(String))];
  const videoUrl = URL.canParse(video) ? new URL(video) : null;
  if (full_name.length < 2 || full_name.length > 160 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !/^\+?[\d ()-]{8,25}$/.test(phone) || qualification.length < 2 || qualification.length > 160 ||
    governorate.length < 2 || governorate.length > 80 || !/^\d{1,2}$/.test(experience) || Number(experience) > 70 ||
    bio.length < 20 || bio.length > 1500 || approach.length < 10 || approach.length > 1000 ||
    !gradeIds.length || gradeIds.length > 20 || (video && (video.length > 2048 || videoUrl?.protocol !== "https:" || videoUrl.username || videoUrl.password))) {
    return "راجع البيانات المطلوبة واختر صف واحد على الأقل. رابط الفيديو لازم يبدأ بـ HTTPS.";
  }
  const [{ data: subject }, { data: grades }] = await Promise.all([
    client.from("subjects").select("id").eq("id", subject_id).maybeSingle(),
    client.from("grades").select("id").in("id", gradeIds),
  ]);
  if (!subject || grades?.length !== gradeIds.length) return "اختار مادة وصفوف موجودة في القائمة.";

  const { data, error } = await client.from("teacher_applications").insert({
    full_name, email, subject_id,
    details: { phone, qualification, governorate, experience: Number(experience), bio, approach, grades: gradeIds, video },
  }).select("id").single();
  if (error) return error.code === "23505" ? "فيه طلب قيد المراجعة للبريد والمادة دول بالفعل." : "تعذّر إرسال الطلب. جرّب مرة تانية.";
  redirect(`/teachers/track?reference=${data.id}`);
}

export async function reviewTeacherApplication(id: string, form: FormData) {
  const account = await getAccount();
  const client = ownerClient();
  if (!client || !account?.roles.some((role) => role === "owner" || role === "admin")) redirect("/account");
  const status = field(form, "status");
  if (status === "accepted") redirect(`/admin/teachers?application=${encodeURIComponent(id)}`);
  if (status !== "rejected") redirect("/admin/teacher-applications");
  const result = await client.from("teacher_applications").update({ status }).eq("id", id).eq("status", "pending");
  redirect(result.error ? "/admin/teacher-applications?status=failed" : "/admin/teacher-applications");
}
