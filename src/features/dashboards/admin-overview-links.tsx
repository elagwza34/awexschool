import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  PlugZap,
  Users,
  MessagesSquare,
  CalendarDays,
} from "lucide-react";
import { Panel } from "./dashboard-panels";

export function AdminOverviewLinks() {
  return (
    <Panel title="مساحات الإدارة" subtitle="كل مهمة في قسم مستقل">
      <div className="grid gap-3 md:grid-cols-3">
        {[
          {
            href: "/admin/enrollments",
            title: "الربط والمجموعات",
            description:
              "ربط الطلاب بأولياء الأمور والمجموعات والمدرسين والمقررات.",
            Icon: Users,
          },
          {
            href: "/admin/team",
            title: "فريق الإدارة",
            description: "إضافة مدير وأعضاء دعم فني في المعاينة.",
            Icon: Users,
          },
          {
            href: "/admin/schedule",
            title: "الجدول الأسبوعي",
            description: "مواعيد الحصص الأسبوعية في المعاينة.",
            Icon: CalendarDays,
          },
          {
            href: "/admin/chat",
            title: "المحادثات",
            description: "تواصل تجريبي مع المدرسين والطلاب وأولياء الأمور.",
            Icon: MessagesSquare,
          },
          {
            href: "/admin/users",
            title: "المستخدمون والأدوار",
            description:
              "عرض الطلاب وأولياء الأمور والمدرسين والإدارة في تابات حسب الدور.",
            Icon: Users,
          },
          {
            href: "/admin/content",
            title: "إدارة المحتوى",
            description: "مراجعة الدروس والموارد وحالة طلبات النشر.",
            Icon: BookOpen,
          },
          {
            href: "/admin/integrations",
            title: "Meet وZoom",
            description: "تفاصيل الاستضافة ومحاكاة إنشاء اجتماع الحصة.",
            Icon: PlugZap,
          },
        ].map(({ href, title, description, Icon }) => (
          <Link
            href={href}
            key={href}
            className="section-shortcut rounded-xl border p-3 hover:border-primary"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="my-1 text-xs leading-7 text-muted-foreground">
              {description}
            </p>
            <span className="flex min-h-11 items-center gap-2 text-xs font-bold text-primary">
              افتح القسم
              <ArrowLeft aria-hidden="true" className="size-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </Panel>
  );
}
