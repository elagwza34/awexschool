import Link from "next/link";
import { resendSignupCode, signUp, verifySignupCode } from "@/features/auth/account-actions";
import { AuthCard, EmailField, FormMessage, authLink } from "@/features/auth/auth-card";
import { AuthSubmit, PasswordField } from "@/features/auth/form-controls";

export const metadata = { title: "تسجيل جديد" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  const activation = message === "confirm" || message === "resent" || message?.startsWith("code-");
  if (activation) return <AuthCard title="تفعيل البريد الإلكتروني" description="اكتب البريد اللي سجلت بيه والكود الموجود في رسالة LiveSchool. تقدر كمان تستخدم رابط التأكيد في الرسالة.">
    {(message === "confirm" || message === "resent") && <FormMessage>لو التسجيل محتاج تأكيد، هتوصلك رسالة. راجع البريد غير المرغوب فيه لو مش ظاهرة.</FormMessage>}
    {message === "code-invalid" && <FormMessage error>راجع البريد والكود. لو الكود انتهت صلاحيته، اطلب واحد جديد.</FormMessage>}
    {message === "code-wait" && <FormMessage error>استنى دقيقة قبل طلب كود جديد.</FormMessage>}
    {message === "code-failed" && <FormMessage error>تعذّر إعادة الإرسال. جرّب مرة تانية بعد قليل.</FormMessage>}
    <form action={verifySignupCode} className="grid gap-4">
      <EmailField />
      <label className="grid gap-2 text-sm font-semibold">كود التفعيل
        <input className="field" name="code" dir="ltr" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10} required />
      </label>
      <AuthSubmit>تفعيل الحساب</AuthSubmit>
    </form>
    <details className="mt-5 border-t pt-4">
      <summary className="cursor-pointer text-sm font-bold text-primary">الرسالة موصلتش؟ أعد الإرسال</summary>
      <form action={resendSignupCode} className="mt-4 grid gap-4">
        <EmailField />
        <AuthSubmit>إعادة إرسال الكود</AuthSubmit>
      </form>
    </details>
    <Link href="/register" className={`mt-3 ${authLink}`}>استخدم بريد مختلف</Link>
  </AuthCard>;

  return <AuthCard title="تسجيل جديد" description="اعمل حساب طالب أو ولي أمر للتسجيل في المقررات.">
    {message === "invalid" && <FormMessage error>راجع البيانات وتأكد إن كلمتي المرور متطابقتين.</FormMessage>}
    {(message === "signup" || message === "unavailable") && <FormMessage error>تعذّر إنشاء الحساب. جرّب مرة تانية بعد قليل.</FormMessage>}
    {message === "wait" && <FormMessage error>استنى دقيقة قبل إعادة المحاولة.</FormMessage>}
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
      <p><Link href="/register?message=code" className={authLink}>تفعيل حساب مسجّل</Link></p>
    </div>
  </AuthCard>;
}
