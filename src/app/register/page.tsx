import Link from "next/link";
import { signUp } from "@/features/auth/account-actions";
import { AuthCard, EmailField, FormMessage, authLink } from "@/features/auth/auth-card";
import { AuthSubmit, PasswordField } from "@/features/auth/form-controls";

export const metadata = { title: "تسجيل جديد" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  return <AuthCard title="تسجيل جديد" description="اعمل حساب طالب أو ولي أمر للتسجيل في المقررات.">
    {message === "confirm" && <FormMessage>راجع بريدك وافتح رابط التأكيد في نفس المتصفح لإكمال التسجيل.</FormMessage>}
    {message === "invalid" && <FormMessage error>راجع البيانات وتأكد إن كلمتي المرور متطابقتين.</FormMessage>}
    {(message === "signup" || message === "unavailable") && <FormMessage error>تعذّر إنشاء الحساب. جرّب مرة تانية بعد قليل.</FormMessage>}
    <form action={signUp} className="grid gap-4">
      <label className="grid gap-2 text-sm font-semibold">الاسم الكامل
        <input className="field" name="name" autoComplete="name" minLength={2} maxLength={100} required />
      </label>
      <EmailField />
      <label className="grid gap-2 text-sm font-semibold">رقم الهاتف (اختياري)
        <input className="field" name="phone" dir="ltr" type="tel" autoComplete="tel" maxLength={25} />
      </label>
      <label className="grid gap-2 text-sm font-semibold">نوع الحساب
        <select className="field" name="kind" defaultValue="" required>
          <option value="" disabled>اختر نوع الحساب</option><option value="student">طالب</option><option value="parent">ولي أمر</option>
        </select>
      </label>
      <PasswordField fresh describedBy="password-rules" />
      <p id="password-rules" className="text-sm text-muted-foreground">استخدم ١٢ حرفًا على الأقل.</p>
      <PasswordField name="confirmPassword" label="تأكيد كلمة المرور" fresh />
      <AuthSubmit>تسجيل جديد</AuthSubmit>
    </form>
    <div className="mt-4 grid border-t pt-3 text-center text-sm">
      <p>هل أنت مدرس؟ <Link href="/teachers/apply" className={authLink}>انضم كمدرس</Link></p>
      <p>عندك حساب؟ <Link href="/login" className={authLink}>تسجيل الدخول</Link></p>
    </div>
  </AuthCard>;
}
