import Link from "next/link";
import { signIn } from "@/features/auth/account-actions";
import { AuthCard, EmailField, FormMessage, authLink } from "@/features/auth/auth-card";
import { AuthSubmit, PasswordField } from "@/features/auth/form-controls";

export const metadata = { title: "تسجيل الدخول" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string; next?: string }> }) {
  const { message, next } = await searchParams;
  return <AuthCard title="تسجيل الدخول" description="ادخل إلى حسابك على LiveSchool.">
    {message === "reset" && <FormMessage>تم تغيير كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.</FormMessage>}
    {message === "login" && <FormMessage error>تعذّر تسجيل الدخول. راجع بياناتك وتأكد من تفعيل البريد الإلكتروني.</FormMessage>}
    {message === "unavailable" && <FormMessage error>تسجيل الدخول غير متاح حاليًا. جرّب مرة تانية.</FormMessage>}
    <form action={signIn} className="grid gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      <EmailField />
      <PasswordField />
      <Link href="/reset-password" className={authLink}>نسيت كلمة المرور؟</Link>
      <AuthSubmit>تسجيل الدخول</AuthSubmit>
    </form>
    <p className="mt-4 flex flex-wrap items-center justify-center gap-2 border-t pt-3 text-sm">
      ليس لدي حساب <Link href="/register" className={authLink}>تسجيل جديد</Link>
    </p>
    <p className="text-center text-sm"><Link href="/register?message=code" className={authLink}>تفعيل البريد أو إعادة إرسال الكود</Link></p>
  </AuthCard>;
}
