import Link from "next/link";
import { FormMessage } from "@/features/auth/auth-card";
import { sessionClient } from "@/features/auth/supabase-server";
import { LiveApplicationForm } from "@/features/teachers/live-application-form";
import { readTeacherCaptchaPublicConfig } from "@/features/teachers/teacher-intake-security";
import { readTeacherSessionAccount } from "@/features/teachers/teacher-session";

export const metadata = { title: "انضم كمدرس" };

const fields = [
  ["fullName", "الاسم الكامل", "text", "name", 160],
  ["phone", "رقم الهاتف", "tel", "tel", 25],
  ["governorate", "المحافظة", "text", "address-level1", 80],
  ["qualification", "المؤهل", "text", "off", 160],
] as const;

export default async function TeacherApplicationPage() {
  const client = await sessionClient(true);
  const account = client ? await readTeacherSessionAccount(client) : null;
  const eligible = !!account?.roles.some((role) => role === "student" || role === "parent");
  const captchaSiteKey = readTeacherCaptchaPublicConfig();
  const [subjects, grades] = eligible && client ? await Promise.all([
    client.from("subjects").select("id,name").order("name"),
    client.from("grades").select("id,name,stage_id,position").order("stage_id").order("position"),
  ]) : [];
  const available = !!subjects?.data?.length && !!grades?.data?.length;
  return <div className="container-shell max-w-3xl py-10">
    <h1 className="text-3xl font-bold">انضم كمدرس</h1>
    <p className="mt-3 text-sm leading-7 text-muted-foreground">عرّفنا بتخصصك وخبرتك. بعد الإرسال هتستلم رقم متابعة للطلب.</p>
    <section className="soft-card mt-6 p-5 sm:p-8">
      {!eligible ? <FormMessage error>سجّل الدخول بحساب طالب أو ولي أمر نشط لإرسال طلب الانضمام.</FormMessage>
        : !captchaSiteKey ? <FormMessage error>تقديم المدرسين غير متاح حاليًا.</FormMessage>
          : !available ? <FormMessage error>تقديم المدرسين غير متاح حاليًا.</FormMessage>
            : <LiveApplicationForm captchaSiteKey={captchaSiteKey}>
        <p className="rounded-lg border p-3 text-sm leading-7">سيتم تسجيل الطلب بالبريد الإلكتروني المؤكد لحسابك.</p>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-bold">بيانات التواصل والخبرة</legend>
          {fields.map(([name, label, type, autoComplete, maxLength]) => <label key={name} className="grid gap-2 text-sm font-semibold">
            {label}<input name={name} type={type} autoComplete={autoComplete} dir={type === "tel" ? "ltr" : undefined}
              maxLength={maxLength} className="field" required />
          </label>)}
          <label className="grid gap-2 text-sm font-semibold">سنوات الخبرة
            <input name="experience" className="field" type="number" min={0} max={70} step={1} required />
          </label>
        </fieldset>
        <fieldset className="grid gap-4 border-t pt-4">
          <legend className="pe-3 font-bold">التخصص والصفوف</legend>
          <label className="grid gap-2 text-sm font-semibold">المادة
            <select name="subject" className="field" defaultValue="" required>
              <option value="" disabled>اختر المادة</option>
              {subjects?.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold">الصفوف اللي بتدرّسها (اختر صف واحد على الأقل)</legend>
            {grades?.data?.map((item) => <label key={item.id} className="flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm">
              <input type="checkbox" name="grades" value={item.id} className="size-4 accent-primary" />{item.name}
            </label>)}
          </fieldset>
        </fieldset>
        <label className="grid gap-2 text-sm font-semibold">نبذة عنك
          <textarea name="bio" className="field min-h-24 py-2" minLength={20} maxLength={1500} required />
        </label>
        <label className="grid gap-2 text-sm font-semibold">طريقة الشرح
          <textarea name="approach" className="field min-h-24 py-2" minLength={10} maxLength={1000} required />
        </label>
        <label className="grid gap-2 text-sm font-semibold">رابط فيديو شرح (اختياري)
          <input name="video" className="field" type="url" dir="ltr" maxLength={2048} />
        </label>
      </LiveApplicationForm>}
      <Link className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline" href="/teachers/track">متابعة طلب تقديم</Link>
    </section>
  </div>;
}
