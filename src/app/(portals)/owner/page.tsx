import type { Metadata } from "next";
import { OwnerPermissions } from "@/features/dashboards/owner-permissions";

export const metadata: Metadata = { title: "لوحة المالك | إدارة الصلاحيات" };

export default function OwnerPage() {
  return <OwnerPermissions />;
}
