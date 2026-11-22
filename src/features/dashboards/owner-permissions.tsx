import { Button } from "@/components/ui/button";
import { dashboardLinks, dashboardRoles, type DashboardRole } from "@/features/auth/dashboard-roles";

const actions: Partial<Record<DashboardRole, readonly { title: string; items: readonly string[] }[]>> = {
  owner: [
    { title: "إجراءات المستخدمين", items: ["إضافة مستخدم", "حذف مستخدم", "قبول أو رفض طلبات المدرسين"] },
    { title: "إجراءات المحتوى والمناهج", items: ["نشر مقرر جديد", "مراجعة طلبات الالتحاق"] },
    { title: "إعدادات المنصة", items: ["تعديل روابط التواصل الاجتماعي"] },
  ],
  admin: [
    { title: "إجراءات المستخدمين", items: ["قبول أو رفض طلبات المدرسين"] },
    { title: "إجراءات المحتوى والمناهج", items: ["نشر مقرر جديد", "مراجعة طلبات الالتحاق"] },
  ],
  teacher: [{ title: "إجراءات الواجبات", items: ["إنشاء واجب", "تصحيح واجب"] }],
  student: [{ title: "إجراءات الواجبات", items: ["تسليم واجب"] }],
};

export function OwnerPermissions({ role }: { role: DashboardRole }) {
  const access = [...dashboardLinks(role), { href: "/account", label: role === "owner" ? "الحسابات" : "حسابي" }];

  return (
    <main id="main-content" tabIndex={-1} className="dashboard-width space-y-6 pt-5 pb-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">إدارة صلاحيات الأدوار</h1>
        <p className="text-sm leading-7 text-muted-foreground">
          اختر دورًا لعرض الأقسام والإجراءات المتاحة له.
        </p>
      </header>
      <form action="/owner/permissions" method="get" className="soft-card flex flex-wrap items-end gap-4 p-4">
        <label className="grid min-w-0 flex-1 gap-2 text-sm font-bold">
          الدور
          <select className="field max-w-xs" name="role" defaultValue={role} key={role}>
            {dashboardRoles.map(({ role, label }) => <option key={role} value={role}>{label}</option>)}
          </select>
        </label>
        <Button type="submit">عرض الصلاحيات</Button>
      </form>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="soft-card space-y-3 p-4">
          <h2 className="text-lg font-bold">الوصول للأقسام</h2>
          <ul className="grid gap-2">
            {access.map(({ href, label }) => (
              <li key={href} className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 rounded-lg border px-3 text-sm font-semibold">
                {label}
              </li>
            ))}
          </ul>
        </section>
        <div className="grid gap-4">
          {actions[role]?.map(({ title, items }) => (
            <section key={title} className="soft-card space-y-3 p-4">
              <h2 className="text-lg font-bold">{title}</h2>
              <ul className="grid gap-2">
                {items.map((item) => <li key={item} className="flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold">{item}</li>)}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
