import { redirect } from "next/navigation";
import { dashboardRoles } from "@/features/auth/dashboard-roles";
import { getAccount } from "@/features/auth/supabase-server";
import { OwnerPermissions } from "@/features/dashboards/owner-permissions";

export const metadata = { title: "إدارة صلاحيات الأدوار | لوحة المالك" };

export default async function OwnerPermissionsPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const account = await getAccount();
  if (!account?.roles.includes("owner")) redirect("/account");
  const { role } = await searchParams;
  return <OwnerPermissions role={dashboardRoles.find((entry) => entry.role === role)?.role ?? "admin"} />;
}