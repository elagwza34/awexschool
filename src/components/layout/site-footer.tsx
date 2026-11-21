import Link from "next/link";
import { ArrowLeft, Headphones, Search } from "lucide-react";
import { Brand } from "@/components/shared";
import { getSocialLinks } from "@/features/auth/supabase-server";
import { SocialLinks } from "./social-links";

const footerNavigation = [
  {
    title: "تصفّح المنصة",
    links: [
      ["المراحل الدراسية", "/stages"],
      ["المواد التعليمية", "/subjects"],
      ["كل المقررات", "/courses"],
      ["المجموعات الدراسية", "/groups"],
      ["مدرسونا", "/teachers"],
    ],
  },
  {
    title: "المساعدة",
    links: [
      ["الأسئلة الشائعة", "/faq"],
      ["تواصل معنا", "/contact"],
      ["متابعة طلب", "/track-request"],
      ["انضم إلينا كمدرس", "/teachers/apply"],
      ["الباقات", "/pricing"],
    ],
  },
] as const;

export async function SiteFooter() {
  const socialLinks = await getSocialLinks();
  return (
    <footer className="mt-auto border-t-4 border-[#e7be72] bg-[#122f27] text-white">
      <div className="container-shell">
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 py-10 sm:py-12 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr] lg:gap-x-8">
          <div className="col-span-2 lg:col-span-1">
            <Brand inverse />
            <p className="mt-4 max-w-64 text-sm leading-7 text-[#d4e5dc]">
              شرح مبسّط ومقررات منظّمة، من الحضانة للثانوي.
            </p>
            <SocialLinks links={socialLinks} inverse className="mt-4" showLabels />
          </div>
          {footerNavigation.map(({ title, links }) => (
            <nav key={title} aria-label={title}>
              <h2 className="mb-2 text-sm font-bold text-[#f2ca84]">{title}</h2>
              <ul>
                {links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="inline-flex min-h-11 items-center text-sm text-[#d4e5dc] hover:text-white hover:underline">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="col-span-2 rounded-2xl border border-white/15 bg-white/5 p-5 lg:col-span-1 lg:self-start">
            <Headphones aria-hidden="true" className="mb-3 size-5 text-[#f2ca84]" />
            <h2 className="font-bold">محتاج مساعدة؟</h2>
            <Link href="/contact" className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm text-[#d4e5dc] hover:text-white hover:underline">
              ابعت لنا طلب
              <ArrowLeft aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-white/15 py-3 text-sm text-[#d4e5dc]">
          <span>© ٢٠٢٦ LiveSchool</span>
          <Link href="/search" className="inline-flex min-h-11 items-center gap-2 hover:text-white hover:underline">
            <Search aria-hidden="true" className="size-4" />
            ابحث عن مادة أو درس
          </Link>
        </div>
      </div>
    </footer>
  );
}
