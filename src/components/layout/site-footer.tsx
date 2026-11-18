import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/shared";
import { Button } from "@/components/ui/button";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-[#173e33] text-white">
      <div className="container-shell py-8">
        <div className="grid gap-6 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <Brand inverse />
            <p className="mt-4 max-w-sm text-sm leading-7 text-[#ceded3]">
              تعليم يبدأ بالفضول، ويكبر بالفهم. مساحة عربية تساعد كل طالب يلاقي
              طريقته في التعلّم.
            </p>
          </div>
          <div>
            <h2 className="mb-3 font-bold">اكتشف liveschool</h2>
            <div className="grid gap-1 text-sm text-[#ceded3]">
              {[
                ["المراحل الدراسية", "/stages"],
                ["كل المقررات", "/courses"],
                ["مدرسونا", "/teachers"],
                ["الباقات التوضيحية", "/pricing"],
                ["لوحات التحكم", "/dashboards"],
              ].map(([label, href]) => (
                <Link
                  className="flex min-h-11 items-center hover:text-white"
                  href={href}
                  key={href}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-3 font-bold">أول خطوة؟ سؤال.</h2>
            <p className="text-sm text-[#ceded3]">
              ابحث عن مادة أو درس وابدأ بفكرة جديدة.
            </p>
            <Button variant="secondary" className="mt-4" asChild>
              <Link href="/search">
                ابحث عن درسك
                <ArrowLeft aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-white/20 pt-4 text-xs text-[#ceded3]">
          <span>liveschool · واجهة تعليمية تجريبية · ٢٠٢٦</span>
          <span>بيانات افتراضية. لا يوجد تسجيل أو دفع فعلي.</span>
        </div>
      </div>
    </footer>
  );
}
