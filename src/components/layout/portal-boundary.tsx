import type { ReactNode } from "react";

import type { DashboardRole } from "@/features/dashboards/types";
import { redirect } from "next/navigation";
import { getAccount } from "@/features/auth/supabase-server";
export type PortalRole = DashboardRole;

export async function PortalBoundary({
  role,
  children,
}: {
  role: PortalRole;
  children: ReactNode;
}) {
  const account = await getAccount();
  if (!account?.roles.includes(role) && !(role === "admin" && account?.roles.includes("owner"))) redirect("/account");
  return children;
}
