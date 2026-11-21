import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { getAccount, getSocialLinks } from "@/features/auth/supabase-server";
import { dashboardFor } from "@/features/auth/dashboard-roles";
import { TeacherApplicationsProvider } from "@/features/teachers/applications-context";
import { PermissionPreviewProvider } from "@/features/dashboards/permissions-context";
import { EnrollmentPreviewProvider } from "@/features/enrollments/context";
import { StaffPreviewProvider } from "@/features/dashboards/staff-context";
import "@fontsource-variable/cairo";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "liveschool | كل فهم.. بداية جديدة", template: "%s | liveschool" },
  description:
    "تصفّح مقررات LiveSchool الدراسية وسجّل طلب التحاقك.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [socialLinks, account] = await Promise.all([getSocialLinks(), getAccount()]);
  return (
    <html lang="ar" dir="rtl">
      <body>
        <a
          className="fixed start-4 top-4 z-50 -translate-y-32 rounded-xl bg-primary px-4 py-3 text-white focus:translate-y-0"
          href="#main-content"
        >
          انتقل إلى المحتوى
        </a>
        <SiteHeader socialLinks={socialLinks} dashboardHref={account ? dashboardFor(account.roles) : undefined} />
        <PermissionPreviewProvider>
          <EnrollmentPreviewProvider>
            <StaffPreviewProvider>
              <TeacherApplicationsProvider>{children}</TeacherApplicationsProvider>
            </StaffPreviewProvider>
          </EnrollmentPreviewProvider>
        </PermissionPreviewProvider>
      </body>
    </html>
  );
}
