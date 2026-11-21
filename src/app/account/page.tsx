import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";
import { addUser, removeUser, signOut } from "@/features/auth/account-actions";
import { dashboardFor, dashboardRoles } from "@/features/auth/dashboard-roles";
import { LivePortalNavigation } from "@/components/layout/live-portal-navigation";

const labels: Record<string, string> = {
  owner: "المالك", admin: "الإدارة", manager: "مدير", support: "الدعم الفني",
  teacher: "مدرس", student: "طالب", parent: "ولي أمر",
};
const messages: Record<string, string> = {
  unavailable: "ربط الحسابات غير متاح في النسخة الحالية.",
  login: "تعذّر تسجيل الدخول. راجع البريد وكلمة المرور وتأكيد البريد.",
  invalid: "راجع البيانات المطلوبة وكلمة المرور.",
  signup: "تعذّر إكمال التسجيل. جرّب مرة تانية.",
  confirm: "لو التسجيل متاح للبريد ده، راجع بريدك وافتح رابط التأكيد في نفس المتصفح.",
  callback: "رابط التأكيد انتهى أو اتفتح في متصفح مختلف.",
  owner: "تأكد البريد، لكن تفعيل دور المالك محتاج مراجعة إعدادات المشروع.",
  denied: "صلاحية المالك مطلوبة للعملية دي.",
  "section-unavailable": "القسم ده لسه مش متاح. اختار قسم من تبويبات لوحتك.",
  "add-failed": "تعذّرت إضافة المستخدم. راجع البريد والدور.",
  "cleanup-failed": "اتعمل حساب، لكن الدور المطلوب ما اتسجلش. راجع الحساب في القائمة قبل استخدامه.",
  added: "تم إنشاء المستخدم وحفظ دوره.",
  "save-failed": "تعذّر حفظ إعداد المعاينة.",
  saved: "تم حفظ إعداد المعاينة.",
  deleted: "تم حذف الحساب.",
  "delete-failed": "تعذّر حذف الحساب. حساب المالك محمي، والحسابات المرتبط بها سجلات ممكن تحتاج معالجة الروابط أولًا.",
};

export const metadata = { title: "حساب LiveSchool" };

function Credentials({ newUser = false }: { newUser?: boolean }) {
  return <>
    <label className="grid gap-2 text-sm font-semibold">البريد الإلكتروني
      <input className="field" type="email" name="email" dir="ltr" maxLength={254} required />
    </label>
    <label className="grid gap-2 text-sm font-semibold">كلمة المرور
      <input className="field" type="password" name="password" dir="ltr" autoComplete={newUser ? "new-password" : "current-password"}
        minLength={newUser ? 12 : undefined} maxLength={newUser ? 72 : undefined} required />
    </label>
  </>;
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; page?: string; from?: string; portal?: string }>;
}) {
  const { message, page, from, portal } = await searchParams;
  const account = await getAccount();
  if (!account) redirect("/login");
  const dashboard = dashboardFor(account.roles);
  if (from === "login" && dashboard !== "/account") redirect(dashboard);
  const accountRole = dashboardRoles.find(({ role }) => role === portal &&
    (account.roles.includes(role) || (role === "admin" && account.roles.includes("owner"))))?.role ??
    dashboardRoles.find(({ role }) => `/${role}` === dashboard)?.role;
  const admin = account?.roles.includes("owner") ? ownerClient() : null;
  const pageNumber = Math.max(1, Math.min(1000, Number.parseInt(page ?? "1", 10) || 1));
  const directory = admin ? await admin.auth.admin.listUsers({ page: pageNumber, perPage: 25 }) : null;
  return (
    <>
    {accountRole && <LivePortalNavigation name={account.name} roles={account.roles} accountRole={accountRole} />}
    <main id="main-content" tabIndex={-1} className={`dashboard-width space-y-5 pb-8 ${accountRole ? "pt-5" : "pt-28"}`}>
      <h1 className="text-2xl font-bold sm:text-3xl">{account ? `حساب ${account.name}` : "حساب LiveSchool"}</h1>
      {message && Object.hasOwn(messages, message) && <p role="status" className="soft-card p-4 text-sm">{messages[message]}</p>}
          <dl className="soft-card grid gap-4 p-5 sm:grid-cols-3">
            <div className="min-w-0"><dt className="text-sm text-muted-foreground">الاسم</dt><dd className="mt-1 break-words font-semibold">{account.name}</dd></div>
            <div className="min-w-0"><dt className="text-sm text-muted-foreground">البريد الإلكتروني</dt><dd className="mt-1 break-all font-semibold"><bdi>{account.user.email ?? "—"}</bdi></dd></div>
            <div className="min-w-0"><dt className="text-sm text-muted-foreground">الأدوار</dt><dd className="mt-1 font-semibold">{account.roles.map((role) => labels[role] ?? role).join("، ") || "لم يُحدد دور"}</dd></div>
          </dl>
          <div className="flex flex-wrap gap-2">
            {dashboardRoles.filter(({ role }) =>
              account.roles.includes(role) || (role === "admin" && account.roles.includes("owner")),
            ).map(({ role, label }) => (
              <Button asChild key={role} variant="outline"><Link href={`/${role}`}>{label}</Link></Button>
            ))}
          </div>
          {account.roles.includes("owner") && (
            <div>
              <form action={addUser} className="soft-card grid gap-3 p-5">
                <h2 className="text-lg font-bold">إضافة مستخدم</h2>
                <label className="grid gap-2 text-sm font-semibold">اسم المستخدم<input className="field" name="name" required minLength={2} maxLength={100} /></label>
                <Credentials newUser />
                <label className="grid gap-2 text-sm font-semibold">الدور
                  <select className="field" name="role">{Object.entries(labels).filter(([role]) => role !== "owner").map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select>
                </label>
                <Button className="justify-self-start">إنشاء الحساب</Button>
              </form>
            </div>
          )}
          {directory && (
            <section className="soft-card space-y-3 p-5">
              <h2 className="text-lg font-bold">حسابات المستخدمين</h2>
              {directory.error ? <p role="alert">تعذّر تحميل الحسابات.</p> : (
                <>
                  <ul className="divide-y">
                    {directory.data.users.map((user) => (
                      <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <bdi className="break-all text-sm">{user.email ?? user.id}</bdi>
                        {user.id !== account.user.id && user.email?.toLowerCase() !== process.env.LIVESCHOOL_OWNER_EMAIL?.trim().toLowerCase() && (
                          <form action={removeUser} className="flex flex-wrap items-center gap-3">
                            <input type="hidden" name="userId" value={user.id} />
                            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="confirmed" required /> تأكيد حذف الحساب</label>
                            <Button variant="outline">حذف</Button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {pageNumber > 1 && <Link className="underline" href={`/account?page=${pageNumber - 1}`}>الصفحة السابقة</Link>}
                    {directory.data.users.length === 25 && <Link className="underline" href={`/account?page=${pageNumber + 1}`}>الصفحة التالية</Link>}
                  </div>
                </>
              )}
            </section>
          )}
          <form action={signOut}><Button variant="outline">تسجيل الخروج</Button></form>
    </main>
    </>
  );
}
