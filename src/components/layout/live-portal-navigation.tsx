"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardLinks, dashboardRoles, type DashboardRole } from "@/features/auth/dashboard-roles";
import { cn } from "@/lib/utils";

export function LivePortalNavigation({ name, roles, accountRole }: { name: string; roles: readonly string[]; accountRole?: DashboardRole }) {
  const pathname = usePathname();
  const ownerSection = roles.includes("owner") && dashboardLinks("owner").some(({ href }) => href === pathname && href !== "/owner");
  const activeRole = accountRole ?? (ownerSection ? "owner" : pathname.split("/")[1]);
  const current = dashboardRoles.find(({ role }) => role === activeRole &&
    (roles.includes(role) || (roles.includes("owner") && role === "admin")));
  if (!current) return null;

  const links = [
    ...dashboardLinks(current.role),
    { href: `/account?portal=${current.role}`, label: "حسابي" },
  ];
  return <div className="container-shell pt-24 sm:pt-28">
    <div className="soft-card min-w-0 px-4 pt-4 sm:px-5">
      <p className="break-words text-lg font-bold">{current.label}</p>
      <p className="mt-1 break-words text-sm text-muted-foreground">{name}</p>
      <nav aria-label="أقسام لوحة التحكم" className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
        {links.map(({ href, label }) => {
          const active = pathname === href.split("?")[0];
          return <Link key={href} href={href} aria-current={active ? "page" : undefined}
          className={cn("inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
            active && "bg-accent text-primary underline underline-offset-4")}>{label}</Link>;
        })}
      </nav>
    </div>
  </div>;
}
