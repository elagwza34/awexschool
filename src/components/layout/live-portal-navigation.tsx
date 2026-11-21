"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardRoles } from "@/features/auth/dashboard-roles";
import { cn } from "@/lib/utils";

export function LivePortalNavigation({ name }: { name: string }) {
  const pathname = usePathname();
  const current = dashboardRoles.find(({ role }) => pathname.split("/")[1] === role);
  if (!current) return null;

  const prefix = `/${current.role}`;
  const courses = ["teacher", "parent", "student"].includes(current.role);
  const links = [
    { href: prefix, label: "نظرة عامة" },
    ...(courses ? [{ href: `${prefix}/courses`, label: "مقرراتي" }] : []),
    ...(current.role === "admin" || current.role === "owner" ? [
      { href: "/admin/catalog", label: "المقررات والالتحاق" },
      { href: "/admin/teacher-applications", label: "طلبات المدرسين" },
    ] : []),
    { href: "/account", label: "حسابي" },
  ];
  return <div className="container-shell pt-24 sm:pt-28">
    <div className="soft-card min-w-0 px-4 pt-4 sm:px-5">
      <p className="break-words text-lg font-bold">{current.label}</p>
      <p className="mt-1 break-words text-sm text-muted-foreground">{name}</p>
      <nav aria-label="أقسام لوحة التحكم" className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
        {links.map(({ href, label }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
          className={cn("inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
            pathname === href && "bg-accent text-primary underline underline-offset-4")}>{label}</Link>)}
      </nav>
    </div>
  </div>;
}
