import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import { Breadcrumbs, DemoNotice, PageIntro, tones } from "@/components/shared";
import { dashboardProfiles } from "@/features/dashboards/mock-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "استكشف لوحات التحكم" };
const descriptions = {
  manager: "متابعة الفريق والطلبات.",
  support: "متابعة التذاكر التقنية.",
  student: "مقرراتك، تقدّمك، وخطوتك الجاية في التعلّم.",
  teacher: "مقرراتك، مجموعاتك، وأعمال تنتظر مراجعتك.",
  parent: "متابعة هادئة لتقدّم الأبناء ومواعيد تعلّمهم.",
  admin: "إدارة المستخدمين والمحتوى والفريق والمحادثات.",
};
const icons = {
  manager: ShieldCheck,
  support: LayoutDashboard,
  student: GraduationCap,
  teacher: LayoutDashboard,
  parent: HeartHandshake,
  admin: ShieldCheck,
};
export default function DashboardPreviewsPage() {
  return (
    <div className="container-shell py-6 md:py-8">
      <Breadcrumbs items={[{ label: "لوحات التحكم" }]} />
      <PageIntro
        eyebrow="مساحات متعددة، ورحلة واحدة"
        title="شوف liveschool من كل زاوية"
        description="استكشف شكل لوحة كل دور. تنقّل بحرية بين المعاينات، بدون تسجيل دخول أو بيانات حقيقية."
      />
      <DemoNotice className="mb-6" />
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <Link href="/owner" className="soft-card space-y-3 p-5 transition-colors hover:border-primary">
          <ShieldCheck aria-hidden="true" className="size-7 text-primary" />
          <h2 className="text-xl font-semibold">لوحة المالك</h2>
          <p className="text-sm text-muted-foreground">إدارة صلاحيات الأدوار وتجربة أثرها على اللوحات.</p>
        </Link>
        {dashboardProfiles.map((profile) => {
          const Icon = icons[profile.role];
          return (
            <Link
              href={`/${profile.role}`}
              key={profile.role}
              className="soft-card group p-5 transition-colors hover:border-primary"
            >
              <div className="mb-4 flex items-center justify-between">
                <span
                  className={cn(
                    "flex size-14 items-center justify-center rounded-2xl",
                    tones[profile.tone],
                  )}
                >
                  <Icon aria-hidden="true" className="size-7" />
                </span>
                <span className="rounded-md border px-3 py-1 text-[11px] text-muted-foreground">
                  معاينة تفاعلية
                </span>
              </div>
              <h2 className="text-xl font-semibold">{profile.label}</h2>
              <p className="my-3 text-sm text-muted-foreground">
                {descriptions[profile.role]}
              </p>
              <span className="mt-4 flex min-h-11 items-center justify-between border-t pt-4 text-sm font-bold text-primary">
                افتح المعاينة
                <ArrowLeft aria-hidden="true" className="size-4" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
