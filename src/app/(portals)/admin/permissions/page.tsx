import { redirect } from "next/navigation";
import { dashboardRoles } from "@/features/auth/dashboard-roles";
import { getAccount } from "@/features/auth/supabase-server";
import { AdminPermissions } from "@/features/dashboards/admin-permissions";

export const metadata = { title: "إدارة صلاحيات الأدوار | لوحة الإدارة" };

export default async function AdminPermissionsPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const account = await getAccount();
  if (!account?.roles.includes("owner")) redirect("/account");
  const { role } = await searchParams;
  return <AdminPermissions role={dashboardRoles.find((entry) => entry.role === role)?.role ?? "admin"} />;
}
