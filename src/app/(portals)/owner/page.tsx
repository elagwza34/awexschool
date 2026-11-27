import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdminPermissions } from "@/features/dashboards/admin-permissions";
import { dashboardRoles } from "@/features/auth/dashboard-roles";
import { getAccount, getSocialLinks, ownerClient, sessionClient } from "@/features/auth/supabase-server";
import { saveOwnerSocialLinks } from "@/features/auth/account-actions";
import { SocialLinksSettings } from "@/features/auth/social-links-settings";
import { assignOwnerServiceTicket, updateManagedAccount } from "@/features/auth/owner-administration-actions";

export const metadata = { title: "لوحة المالك | إدارة الصلاحيات" };

const categories = {
  general: "استفسار عام",
  registration: "التسجيل",
  enrollment: "الالتحاق",
  complaint: "شكوى",
  technical: "دعم فني",
};
const staffRoles = {
  admin: "إدارة",
  manager: "مدير",
  support: "دعم فني",
  customer_service: "خدمة العملاء",
};
const statuses: Record<string, string> = { pending: "قيد التحقق", active: "نشط", disabled: "موقوف" };
type Queue = {
  tickets: { id: string; title: string; status: string; service_category: string | null; assigned_staff_id: string | null }[];
  staff: { id: string; name: string; role: string }[];
};

export default async function OwnerPage({ searchParams }: {
  searchParams: Promise<{ role?: string; social?: string; assignment?: string; accountUpdate?: string; page?: string }>;
}) {
  const account = await getAccount();
  if (!account?.roles.includes("owner")) redirect("/?message=denied");

  const params = await searchParams;
  const role = dashboardRoles.find((entry) => entry.role === params.role)?.role ?? "admin";
  const page = Math.max(1, Math.min(1000, Number.parseInt(params.page ?? "", 10) || 1));
  const client = await sessionClient();
  const admin = ownerClient();
  const [queueResult, directory, activity, links] = await Promise.all([
    client?.rpc("owner_service_assignment_queue"),
    admin?.auth.admin.listUsers({ page, perPage: 25 }),
    client?.from("owner_account_activity").select("id,account_id,kind,before_value,after_value")
      .order("id", { ascending: false }).limit(30),
    getSocialLinks(),
  ]);
  const queue = queueResult?.error ? null : queueResult?.data as Queue | null;
  const users = directory?.data?.users ?? [];
  const ids = users.map(({ id }) => id);
  const [profiles, assignedRoles] = admin && ids.length ? await Promise.all([
    admin.from("profiles").select("user_id,display_name,status").in("user_id", ids),
    admin.from("account_roles").select("user_id,role_code").in("user_id", ids),
  ]) : [null, null];

  return <AdminPermissions role={role} ownerWorkspace>
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline"><Link href="/admin">لوحة الإدارة</Link></Button>
      <Button asChild variant="outline"><Link href="/account">إنشاء حساب</Link></Button>
      <Button asChild variant="outline"><Link href="/admin/teachers">إدارة المدرسين</Link></Button>
      <Button asChild variant="outline"><Link href="/admin/teacher-applications">طلبات المدرسين</Link></Button>
      <Button asChild variant="outline"><Link href="/admin/site-locks">أقفال الموقع</Link></Button>
      <Button asChild variant="outline"><Link href="/admin/integrations">إعدادات الاجتماعات</Link></Button>
    </div>
    <SocialLinksSettings action={saveOwnerSocialLinks} links={links} message={params.social} />
    <section id="owner-accounts" className="soft-card space-y-3 p-4">
      <h2 className="text-lg font-bold">المستخدمون والفريق</h2>
      {params.accountUpdate && <p role="status">{params.accountUpdate === "saved" ? "تم حفظ التحديث." : "تعذّر حفظ التحديث. راجع الحالة الحالية للحساب."}</p>}
      {!directory || directory.error || profiles?.error || assignedRoles?.error ? <p role="alert">تعذّر تحميل الحسابات.</p> :
        <ul className="divide-y">
          {users.map((user) => {
            const profile = profiles?.data?.find(({ user_id }) => user_id === user.id);
            const roles = (assignedRoles?.data ?? []).filter(({ user_id }) => user_id === user.id).map(({ role_code }) => role_code as string);
            const managed = profile && roles.length > 0 && !roles.includes("owner") && user.id !== account.user.id;
            const staffRole = roles.length === 1 && Object.hasOwn(staffRoles, roles[0]) ? roles[0] : null;
            return <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-semibold">{profile?.display_name ?? "حساب"}</p>
                <bdi className="break-all text-sm">{user.email ?? user.id}</bdi>
                <p className="text-sm text-muted-foreground">
                  {roles.map((key) => dashboardRoles.find(({ role }) => role === key)?.label ?? key).join("، ")}
                  {profile && ` · ${statuses[profile.status] ?? profile.status}`}
                </p>
              </div>
              {managed && <div className="flex flex-wrap gap-2">
                <form action={updateManagedAccount}>
                  <input type="hidden" name="account" value={user.id} />
                  <input type="hidden" name="kind" value="status" />
                  <input type="hidden" name="expected" value={profile.status} />
                  <Button variant="outline" name="value" value={profile.status === "active" ? "disabled" : "active"}>
                    {profile.status === "active" ? "تعليق الحساب" : "تفعيل الحساب"}
                  </Button>
                </form>
                {staffRole && <form action={updateManagedAccount} className="flex flex-wrap gap-2">
                  <input type="hidden" name="account" value={user.id} />
                  <input type="hidden" name="kind" value="staff_role" />
                  <input type="hidden" name="expected" value={staffRole} />
                  <select aria-label="دور الفريق" className="field w-auto" name="value" defaultValue="" required>
                    <option value="">اختر الدور</option>
                    {Object.entries(staffRoles).filter(([value]) => value !== staffRole).map(([value, label]) =>
                      <option key={value} value={value}>{label}</option>)}
                  </select>
                  <Button variant="outline">حفظ الدور</Button>
                </form>}
              </div>}
            </li>;
          })}
        </ul>}
      <nav aria-label="صفحات المستخدمين" className="flex flex-wrap gap-3 text-sm">
        {page > 1 && <Link href={`/owner?page=${page - 1}#owner-accounts`} className="underline">السابقة</Link>}
        {users.length === 25 && page < 1000 && <Link href={`/owner?page=${page + 1}#owner-accounts`} className="underline">التالية</Link>}
      </nav>
    </section>
    <section id="owner-tickets" className="soft-card space-y-3 p-4">
      <h2 className="text-lg font-bold">إسناد طلبات خدمة العملاء والدعم الفني</h2>
      {params.assignment && <p role="status">{params.assignment === "saved" ? "تم إسناد الطلب." : "تعذّر إسناد الطلب. راجع نوع الطلب ودور عضو الفريق."}</p>}
      {!queue ? <p role="alert">سجل الإسناد غير متاح حاليًا.</p> :
        queue.tickets.length ? <ul className="grid gap-3">{queue.tickets.map((ticket) => (
          <li className="rounded-lg border p-3" key={ticket.id}>
            <p className="font-semibold">{ticket.title}</p>
            {queue.staff.find(({ id }) => id === ticket.assigned_staff_id)?.name && <p className="text-sm text-muted-foreground">
              {queue.staff.find(({ id }) => id === ticket.assigned_staff_id)?.name}
            </p>}
            <form action={assignOwnerServiceTicket} className="mt-2 flex flex-wrap items-end gap-2">
              <input type="hidden" name="request" value={ticket.id} />
              <label className="grid gap-1 text-sm">نوع الطلب
                <select name="category" className="field" defaultValue={ticket.service_category ?? ""} required>
                  <option value="">اختر النوع</option>
                  {Object.entries(categories).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm">عضو الفريق
                <select name="staff" className="field" defaultValue={ticket.assigned_staff_id ?? ""} required>
                  <option value="">اختر العضو</option>
                  {queue.staff.map((entry) => <option key={`${entry.id}-${entry.role}`} value={entry.id}>
                    {entry.name} · {staffRoles[entry.role as keyof typeof staffRoles]}
                  </option>)}
                </select>
              </label>
              <Button>إسناد الطلب</Button>
            </form>
          </li>
        ))}</ul> : <p>لا توجد طلبات مفتوحة.</p>}
    </section>
    <section className="soft-card space-y-3 p-4">
      <h2 className="text-lg font-bold">سجل إدارة الحسابات</h2>
      {!activity || activity.error ? <p role="alert">تعذّر تحميل السجل.</p> :
        activity.data?.length ? <ul className="grid gap-2">
          {activity.data.map((entry) => <li key={entry.id} className="rounded-lg border p-3 text-sm">
            {entry.kind === "status" ? "حالة الحساب" : "دور الفريق"} · <bdi>{entry.account_id}</bdi> · <bdi>{entry.before_value} → {entry.after_value}</bdi>
          </li>)}
        </ul> : <p>لا يوجد نشاط مسجل.</p>}
    </section>
  </AdminPermissions>;
}
