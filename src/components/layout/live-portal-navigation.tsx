"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { dashboardLinks, dashboardRoles, isAdminWorkspace, type DashboardRole } from "@/features/auth/dashboard-roles";
import { cn } from "@/lib/utils";

export function LivePortalNavigation({ name, roles, accountRole }: { name: string; roles: readonly string[]; accountRole?: DashboardRole }) {
  const pathname = usePathname();
  const tabStrip = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = tabStrip.current;
    if (nav && nav.scrollWidth > nav.clientWidth) {
      nav.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [pathname]);
  const adminWorkspace = roles.some((role) => role === "admin" || role === "owner") && isAdminWorkspace(pathname);
  const segment = pathname.split("/")[1];
  const activeRole = adminWorkspace ? "admin" : accountRole ?? (segment === "customer-service" ? "customer_service" : segment);
  const current = dashboardRoles.find(({ role }) => role === activeRole && (adminWorkspace || roles.includes(role)));
  if (!current) return null;

  const sections = dashboardLinks(current.role);
  const links = adminWorkspace ? sections : [...sections, { href: `/account?portal=${current.role}`, label: "حسابي" }];
  const activePath = adminWorkspace && ["/admin/teacher-applications", "/admin/finance"].includes(pathname) ? "/admin/teachers"
    : adminWorkspace && pathname === "/admin/permissions" ? "/account"
    : adminWorkspace && (pathname === "/admin/settings" || pathname === "/admin/integrations") ? "/admin"
    : pathname;
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join(" ");
  return <div className="min-w-0 pt-24">
    <div className="border-b bg-white">
      <div className="dashboard-width flex min-h-16 flex-wrap items-center justify-between gap-3 py-2">
        <p className="min-w-0 break-words text-base font-bold">{current.label}</p>
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-primary" aria-hidden="true">{initials}</span>
          <p className="break-words text-sm font-semibold">{name}</p>
        </div>
      </div>
    </div>
    <div className="border-b bg-white">
      <nav ref={tabStrip} aria-label="أقسام لوحة التحكم" className="dashboard-width overflow-x-auto">
        <div className={cn("flex w-max min-w-full gap-2", adminWorkspace && "py-2")}>
        {links.map(({ href, label }) => {
          const active = activePath === href.split("?")[0];
          return <Link key={href} href={href} aria-current={active ? "page" : undefined}
          className={cn("inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
            adminWorkspace ? "rounded-lg border border-transparent" : "border-b-2 first:ps-0",
            active ? adminWorkspace ? "border-primary bg-accent text-primary" : "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:bg-secondary hover:text-primary")}>{label}</Link>;
        })}
        </div>
      </nav>
    </div>
  </div>;
}
