"use server";

import { redirect } from "next/navigation";
import { ownerClient, sessionClient } from "@/features/auth/supabase-server";
import { readTeacherSessionAccount } from "./teacher-session";
import { buildTeacherIntakeChallenge, readTrustedRequestIp, verifyTeacherCaptcha } from "./teacher-intake-security";

const field = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const applicationUnavailable = "تقديم المدرسين غير متاح حاليًا.";
const accountRequired = "سجّل الدخول بحساب طالب أو ولي أمر نشط لإرسال طلب الانضمام.";
const captchaRequired = "تعذّر التحقق الأمني. حاول مرة تانية.";
const trackingUnavailable = "متابعة الطلبات غير متاحة حاليًا.";
const trackingMissing = "الطلب غير موجود أو رقم المتابعة غير صحيح.";

export async function submitTeacherApplication(_previous: string, form: FormData) {
  const client = await sessionClient(true);
  if (!client) return applicationUnavailable;
  const account = await readTeacherSessionAccount(client);
  if (!account || !account.roles.some((role) => role === "student" || role === "parent")) return accountRequired;

  const full_name = field(form, "fullName");
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
  if (full_name.length < 2 || full_name.length > 160 || !subject_id ||
      !/^\+?[\d ()-]{8,25}$/.test(phone) || qualification.length < 2 || qualification.length > 160 ||
      governorate.length < 2 || governorate.length > 80 || !/^\d{1,2}$/.test(experience) || Number(experience) > 70 ||
      bio.length < 20 || bio.length > 1500 || approach.length < 10 || approach.length > 1000 ||
      !gradeIds.length || gradeIds.length > 20 || (video && (video.length > 2048 || videoUrl?.protocol !== "https:" || videoUrl.username || videoUrl.password))) {
    return "راجع البيانات المطلوبة واختر صف واحد على الأقل. رابط الفيديو لازم يبدأ بـ HTTPS.";
  }

  if (!await verifyTeacherCaptcha(form.get("captchaToken"), "teacher_apply")) return captchaRequired;
  const owner = ownerClient();
  if (!owner) return applicationUnavailable;
  let challenge;
  try {
    challenge = buildTeacherIntakeChallenge({
      purpose: "submit", actorId: account.user.id, applicationId: null, email: null,
      ip: await readTrustedRequestIp(),
    });
  } catch {
    return captchaRequired;
  }
  const inserted = await owner.from("teacher_intake_challenges").insert(challenge).select("id").single();
  if (inserted.error || !inserted.data?.id) return applicationUnavailable;

  const profile = {
    fullName: full_name, phone, qualification, governorate, experience: Number(experience),
    bio, approach, grades: gradeIds, video,
  };
  const { data, error } = await client.rpc("submit_teacher_application", {
    p_challenge: challenge.id, p_subject_id: subject_id, p_profile: profile,
  });
  if (error || !data) {
    if (error?.code === "23505") return "فيه طلب قيد المراجعة للبريد والمادة دول بالفعل.";
    return error?.message === "teacher_intake_challenge_invalid" ? captchaRequired : "تعذّر إرسال الطلب. جرّب مرة تانية.";
  }
  redirect(`/teachers/track?reference=${data}`);
}

export async function trackTeacherApplication(_previous: string, form: FormData) {
  const client = await sessionClient(true);
  if (!client) return trackingUnavailable;
  const reference = field(form, "reference");
  const email = field(form, "email").toLowerCase();
  if (!uuid.test(reference) || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return trackingMissing;
  if (!await verifyTeacherCaptcha(form.get("captchaToken"), "teacher_track")) return captchaRequired;

  const { data: { user } } = await client.auth.getUser();
  const owner = ownerClient();
  if (!owner) return trackingUnavailable;
  let challenge;
  try {
    challenge = buildTeacherIntakeChallenge({
      purpose: "track", actorId: user?.email_confirmed_at ? user.id : null,
      applicationId: reference, email, ip: await readTrustedRequestIp(),
    });
  } catch {
    return captchaRequired;
  }
  const inserted = await owner.from("teacher_intake_challenges").insert(challenge).select("id").single();
  if (inserted.error || !inserted.data?.id) return trackingUnavailable;

  const { data, error } = await client.rpc("track_teacher_application", { p_challenge: challenge.id });
  if (error || !["pending", "accepted", "rejected"].includes(data ?? "")) return trackingMissing;
  return data;
}

export async function reviewTeacherApplication(id: string, form: FormData) {
  const client = await sessionClient(true);
  const account = client ? await readTeacherSessionAccount(client) : null;
  if (!client || !account?.roles.some((role) => role === "owner" || role === "admin")) redirect("/account");
  const status = field(form, "status");
  if (!uuid.test(id) || (status !== "accepted" && status !== "rejected")) redirect("/admin/teacher-applications?status=failed");

  const { data, error } = await client.rpc("review_teacher_application_as_admin", {
    p_application: id, p_status: status,
  });
  if (error || data !== true) redirect("/admin/teacher-applications?status=failed");
  redirect(status === "accepted" ? `/admin/teachers?application=${id}` : "/admin/teacher-applications");
}
