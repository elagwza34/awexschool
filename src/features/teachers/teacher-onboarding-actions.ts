"use server";

import { redirect } from "next/navigation";
import { ownerClient, sessionClient } from "@/features/auth/supabase-server";
import { readTeacherSessionAccount } from "./teacher-session";

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const compensationRequired = "تعذّر تأكيد اكتمال العملية. راجع دليل الحسابات قبل إعادة المحاولة.";

export async function onboardTeacher(applicationId: string | null, _previous: string, form: FormData): Promise<string> {
  const client = await sessionClient(true);
  const account = client ? await readTeacherSessionAccount(client) : null;
  if (!client || !account?.roles.some((role) => role === "admin" || role === "owner")) redirect("/account");
  const field = (name: string) => String(form.get(name) ?? "").trim();
  const email = field("email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const grades = [...new Set(form.getAll("grades").map(String))];
  const profile = {
    fullName: field("fullName"), displayName: field("displayName"), phone: field("phone"),
    governorate: field("governorate"), subject: field("subject"), qualification: field("qualification"),
    experience: field("experience"), bio: field("bio"), approach: field("approach"),
    video: field("video"), portrait: field("portrait"), grades,
  };
  const video = URL.canParse(profile.video) ? new URL(profile.video) : null;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email === process.env.LIVESCHOOL_OWNER_EMAIL?.trim().toLowerCase() || password.length < 12 || Buffer.byteLength(password) > 72 ||
      profile.displayName.length < 2 || profile.displayName.length > 100 || profile.fullName.length < 2 || profile.fullName.length > 160 ||
      !/^\+?[\d ()-]{8,25}$/.test(profile.phone) || profile.governorate.length < 2 || profile.governorate.length > 80 ||
      profile.qualification.length < 2 || profile.qualification.length > 160 || !/^\d{1,2}$/.test(profile.experience) || Number(profile.experience) > 70 ||
      profile.bio.length < 20 || profile.bio.length > 1500 || profile.approach.length < 10 || profile.approach.length > 1000 ||
      grades.length < 1 || grades.length > 20 ||
      (profile.video && (profile.video.length > 2048 || video?.protocol !== "https:" || video.username || video.password)) ||
      (profile.portrait && !/^\/teachers\/[a-z0-9-]+\.webp$/.test(profile.portrait))) {
    return "راجع البيانات المطلوبة والصفوف المختارة وكلمة المرور. رابط الفيديو لازم يكون HTTPS.";
  }
  if (applicationId && !uuid.test(applicationId)) return "طلب التقديم غير متاح.";
  const [subject, validGrades] = await Promise.all([
    client.from("subjects").select("id").eq("id", profile.subject).maybeSingle(),
    client.from("grades").select("id").in("id", grades),
  ]);
  if (!subject.data || validGrades.data?.length !== grades.length) return "اختار مادة وصفوف موجودة في القائمة.";

  const owner = ownerClient();
  if (!owner) return "إنشاء حساب المدرس غير متاح حاليًا.";
  const { data, error } = await owner.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { display_name: profile.displayName },
    app_metadata: { liveschool_role: "student" },
  });
  if (error || !data.user) {
    return error?.code === "email_exists" || error?.code === "user_already_exists"
      ? "البريد مربوط بحساب موجود بالفعل." : "تعذّر إنشاء حساب المدرس.";
  }
  const userId = data.user.id;
  const destination = `/admin/teachers?message=added&created=${userId}`;
  const result = await client.rpc("complete_teacher_onboarding", {
    p_user: userId, p_application: applicationId, p_profile: profile,
  });
  if (result.error) {
    const verified = await client.from("teacher_profiles").select("user_id").eq("user_id", userId).maybeSingle();
    if (verified.data) redirect(destination);
    if (verified.error || !result.status || result.status >= 500) return compensationRequired;
    const cleanup = await owner.auth.admin.deleteUser(userId);
    return cleanup.error ? compensationRequired : "تعذّر حفظ ملف المدرس. حاول مرة تانية.";
  }
  redirect(destination);
}
