import Link from "next/link";
import { requestPasswordCode, resetPassword } from "@/features/auth/account-actions";
import { AuthCard, EmailField, FormMessage, authLink } from "@/features/auth/auth-card";
import { AuthSubmit, PasswordField } from "@/features/auth/form-controls";

export const metadata = { title: "استعادة كلمة المرور" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ step?: string; message?: string }> }) {
  const { step, message } = await searchParams;
  const code = step === "code";
  return <AuthCard title={code ? "اختار كلمة مرور جديدة" : "نسيت كلمة المرور؟"} description={code
    ? "اكتب البريد والكود اللي وصلك، وبعدها اختار كلمة مرور جديدة."
    : "اكتب بريد الحساب علشان نرسل لك كود استعادة كلمة المرور."}>
    {code && !message && <FormMessage>لو البريد مسجّل، هيوصلك كود. راجع الرسائل غير المرغوب فيها لو مش ظاهر.</FormMessage>}
    {message === "code" && <FormMessage error>الكود غير صحيح أو انتهت صلاحيته. راجع الكود أو اطلب كود جديد.</FormMessage>}
    {message === "invalid" && <FormMessage error>راجع البيانات وتأكد إن كلمتي المرور متطابقتين.</FormMessage>}
    {message === "failed" && <FormMessage error>تعذّر تغيير كلمة المرور. اطلب كود جديد واختار كلمة مرور مختلفة.</FormMessage>}
    <form action={code ? resetPassword : requestPasswordCode} className="grid gap-4">
      <EmailField />
      {code && <>
        <label className="grid gap-2 text-sm font-semibold">كود التفعيل
          <input className="field" name="code" dir="ltr" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10} required />
        </label>
        <PasswordField fresh describedBy="password-rules" />
        <p id="password-rules" className="text-sm text-muted-foreground">استخدم ١٢ حرفًا على الأقل.</p>
        <PasswordField name="confirmPassword" label="تأكيد كلمة المرور" fresh />
      </>}
      <AuthSubmit>{code ? "حفظ كلمة المرور الجديدة" : "إرسال الكود"}</AuthSubmit>
    </form>
    <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
      <Link href="/login" className={authLink}>الرجوع لتسجيل الدخول</Link>
      {code && <Link href="/reset-password" className={authLink}>اطلب كود جديد</Link>}
    </div>
  </AuthCard>;
}
