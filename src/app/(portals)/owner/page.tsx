import type { Metadata } from "next";
import { OwnerPermissions } from "@/features/dashboards/owner-permissions";
import { getAccount } from "@/features/auth/supabase-server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "لوحة المالك | إدارة الصلاحيات" };

export default async function OwnerPage() {
  const account = await getAccount();
  if (!account?.roles.includes("owner")) redirect("/account");
  return <OwnerPermissions />;
}
