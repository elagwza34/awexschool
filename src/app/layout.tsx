import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import "@fontsource-variable/cairo";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "liveschool | كل فهم.. بداية جديدة", template: "%s | liveschool" },
  description:
    "اكتشف واجهة liveschool التعليمية: مقررات ودروس للابتدائي والإعدادي والثانوي. نسخة عرض ببيانات افتراضية.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <a
          className="fixed start-4 top-4 z-50 -translate-y-32 rounded-xl bg-primary px-4 py-3 text-white focus:translate-y-0"
          href="#main-content"
        >
          انتقل إلى المحتوى
        </a>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
