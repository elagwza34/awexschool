"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOut } from "@/features/auth/account-actions";
import { SocialLinks } from "./social-links";
import type { SocialLinksConfig } from "@/features/auth/social-links";
import { isAdminWorkspace } from "@/features/auth/dashboard-roles";

const navigation = [
  { href: "/stages", title: "المراحل الدراسية" },
  { href: "/subjects", title: "المواد التعليمية" },
  { href: "/courses", title: "المقررات" },
  { href: "/groups", title: "المجموعات الدراسية" },
  { href: "/teachers", title: "مدرسونا" },
  { href: "/faq", title: "الأسئلة الشائعة" },
];

export function SiteHeader({ socialLinks, dashboardHref }: { socialLinks: SocialLinksConfig; dashboardHref?: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const isHome = path === "/";
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        document.getElementById("mobile-toggle")?.focus();
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open]);
  if (dashboardHref === "/admin" && isAdminWorkspace(path)) {
    return (
      <header data-home-header="" className="site-header-width fixed inset-x-0 top-3 z-30 rounded-[2rem] border border-emerald-950/10 bg-white shadow-md">
        <div className="container-shell flex min-h-17 items-center justify-between gap-4">
          <Brand />
          <Button asChild variant="ghost"><Link href="/">عرض الموقع</Link></Button>
        </div>
      </header>
    );
  }
  return (
    <header
      data-home-header=""
      className="site-header-width fixed inset-x-0 top-3 z-30 rounded-[2rem] border border-emerald-950/10 bg-white shadow-md"
    >
      <div className="container-shell flex min-h-17 items-center justify-between gap-4">
        <Brand />
        <nav
          aria-label="التنقل الرئيسي"
          className="hidden items-center gap-3 2xl:flex"
        >
          {navigation.map(({ href, title }) => (
            <Link
              aria-current={path.startsWith(href) ? "page" : undefined}
              key={href}
              className={cn(
                "inline-flex min-h-11 items-center text-sm font-semibold transition-colors hover:text-primary",
                path.startsWith(href) &&
                  "text-primary underline decoration-2 underline-offset-8",
              )}
              href={href}
            >
              {title}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <SocialLinks links={socialLinks} className="hidden xl:flex" />
          {dashboardHref ? (
            <>
              <Button asChild variant="ghost" className="hidden rounded-full sm:inline-flex">
                <Link href={dashboardHref} onClick={() => setOpen(false)}>لوحة التحكم</Link>
              </Button>
              <form action={signOut} className="inline">
                <Button variant="ghost" className="hidden rounded-full sm:inline-flex">تسجيل الخروج</Button>
              </form>
            </>
          ) : (
            <Button asChild variant="ghost" className="hidden rounded-full sm:inline-flex">
              <Link href="/login">تسجيل الدخول</Link>
            </Button>
          )}
          <Button asChild className="hidden rounded-full sm:inline-flex">
            {isHome ? <a href="#trial">احجز حصة مجانية</a> : <Link href="/#trial">احجز حصة مجانية</Link>}
          </Button>
          <Button
            id="mobile-toggle"
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            variant="outline"
            size="icon"
            className="2xl:hidden"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          data-lenis-prevent=""
          aria-label="التنقل على الهاتف"
          className="container-shell max-h-[75svh] overflow-y-auto border-t py-4 2xl:hidden"
        >
          {[
            ...navigation,
            { href: isHome ? "#trial" : "/#trial", title: "احجز حصة مجانية" },
            ...(dashboardHref
                ? [
                    { href: dashboardHref, title: "لوحة التحكم" },
                    { href: "/account", title: "تسجيل الخروج", logout: true },
                  ]
                : [
                    { href: "/login", title: "تسجيل الدخول" },
                    { href: "/register", title: "ابدأ رحلتك" },
                  ]),
          ].map((item) => {
            const { href, title } = item;
            const logout = "logout" in item && item.logout;
            return logout ? (
              <form key="logout" action={signOut} className="w-full">
                <Button variant="outline" className="w-full">
                  {title}
                </Button>
              </form>
            ) : (
              <Link
                key={href}
                href={href}
                aria-current={path === href || path.startsWith(`${href}/`) ? "page" : undefined}
                className="block rounded-lg px-3 py-3 hover:bg-accent aria-[current=page]:bg-accent aria-[current=page]:font-semibold"
                onClick={() => setOpen(false)}
              >
                {title}
              </Link>
            )
          })}
          <SocialLinks links={socialLinks} className="mt-3 border-t pt-4" showLabels />
        </nav>
      )}
      {isHome && (
        <span
          aria-hidden="true"
          data-home-progress
          className="absolute inset-x-4 bottom-0 h-0.5 origin-right scale-x-0 rounded-full bg-[#1a9b79]"
        />
      )}
    </header>
  );
}
