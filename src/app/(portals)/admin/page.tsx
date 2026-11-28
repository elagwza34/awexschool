import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { PortalMetrics } from "@/components/layout/portal-metrics";
import { Button } from "@/components/ui/button";
import {
  getAccount,
  ownerClient,
} from "@/features/auth/supabase-server";

export const metadata = {
  title: "لوحة الإدارة",
};

export const dynamic = "force-dynamic";

type Metric = {
  label: string;
  value: number | null;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    social?: string;
    role?: string;
  }>;
}) {
  const account = await getAccount();

  if (
    !account?.roles.some(
      (role) => role === "admin" || role === "owner"
    )
  ) {
    redirect("/account");
  }

  const canManagePlatform =
    account.roles.includes("owner");

  const { social, role } = await searchParams;

  if (social) {
    redirect(
      `/admin/settings?social=${encodeURIComponent(social)}#social-links`
    );
  }

  if (role) {
    redirect(
      `/admin/permissions?role=${encodeURIComponent(role)}`
    );
  }

  const client = ownerClient();

  if (!client) {
    return (
      <main className="dashboard-width py-10">
        <div className="soft-card p-6">
          تعذر الاتصال بقاعدة البيانات.
        </div>
      </main>
    );
  }

  // Fetch exact counts from Supabase.
  async function count(
    table: string,
    filters: Record<string, string | boolean> = {}
  ): Promise<number | null> {
    let query = client!
      .from(table)
      .select("*", {
        head: true,
        count: "exact",
      });

    for (const [column, value] of Object.entries(
      filters
    )) {
      query = query.eq(column, value);
    }

    const { count, error } = await query;

    if (error) {
      console.error(
        `[Admin Dashboard] ${table}:`,
        error.message
      );
      return null;
    }

    return count ?? null;
  }

  async function metric(
    label: string,
    table: string,
    filters: Record<string, string | boolean> = {}
  ): Promise<Metric> {
    return {
      label,
      value: await count(table, filters),
    };
  }

  // Dashboard sections.
  const sections = await Promise.all([
    // Users
    Promise.all([
      metric("إجمالي الحسابات", "profiles"),
      metric("الحسابات النشطة", "profiles", {
        status: "active",
      }),
      metric("الحسابات المعطلة", "profiles", {
        status: "disabled",
      }),
      metric("الحسابات المعلقة", "profiles", {
        status: "pending",
      }),
      metric("الطلاب", "account_roles", {
        role_code: "student",
      }),
      metric("أولياء الأمور", "account_roles", {
        role_code: "parent",
      }),
      metric("المدرسون", "account_roles", {
        role_code: "teacher",
      }),
      metric("روابط أولياء الأمور", "guardian_links"),
    ]),

    // Educational content
    Promise.all([
      metric("المراحل التعليمية", "stages"),
      metric("الصفوف الدراسية", "grades"),
      metric("المواد الدراسية", "subjects"),
      metric("إجمالي المقررات", "courses"),
      metric("المقررات المنشورة", "courses", {
        status: "published",
      }),
      metric("المسودات", "courses", {
        status: "draft",
      }),
      metric("قيد المراجعة", "courses", {
        status: "review",
      }),
      metric("المقررات المؤرشفة", "courses", {
        status: "archived",
      }),
      metric("الوحدات التعليمية", "course_units"),
      metric("الدروس", "lessons"),
    ]),

    // Course enrollments
    Promise.all([
      metric("إجمالي الاشتراكات", "course_enrollments"),
      metric("الاشتراكات النشطة", "course_enrollments", {
        status: "active",
      }),
      metric("الاشتراكات المعلقة", "course_enrollments", {
        status: "pending",
      }),
      metric("الاشتراكات المرفوضة", "course_enrollments", {
        status: "declined",
      }),
    ]),

    // Teachers
    Promise.all([
      metric("ملفات المدرسين", "teacher_profiles"),
      metric("إجمالي طلبات المدرسين", "teacher_applications"),
      metric("الطلبات المعلقة", "teacher_applications", {
        status: "pending",
      }),
      metric("الطلبات المقبولة", "teacher_applications", {
        status: "accepted",
      }),
      metric("الطلبات المرفوضة", "teacher_applications", {
        status: "rejected",
      }),
    ]),

    // Learning groups
    Promise.all([
      metric("إجمالي المجموعات", "learning_groups"),
      metric("المجموعات النشطة", "learning_groups", {
        active: true,
      }),
      metric("المجموعات المتوقفة", "learning_groups", {
        active: false,
      }),
      metric("عضويات المجموعات", "group_members"),
      metric("طلبات الانضمام", "group_join_requests"),
      metric("الطلبات المحجوزة", "group_join_requests", {
        status: "reserved",
      }),
      metric("الطلبات المقبولة", "group_join_requests", {
        status: "approved",
      }),
    ]),

    // Class sessions
    Promise.all([
      metric("إجمالي الحصص", "class_sessions"),
      metric("الحصص المجدولة", "class_sessions", {
        status: "scheduled",
      }),
      metric("الحصص المكتملة", "class_sessions", {
        status: "completed",
      }),
      metric("الحصص الملغاة", "class_sessions", {
        status: "cancelled",
      }),
    ]),

    // Attendance
    Promise.all([
      metric("إجمالي سجلات الحضور", "session_attendance"),
      metric("الحضور", "session_attendance", {
        status: "present",
      }),
      metric("الغياب", "session_attendance", {
        status: "absent",
      }),
      metric("التأخير", "session_attendance", {
        status: "late",
      }),
    ]),

    // Assignments
    Promise.all([
      metric("الواجبات", "course_assignments"),
      metric("تسليمات الواجبات", "course_assignment_submissions"),
    ]),

    // Customer service
    Promise.all([
      metric("إجمالي الطلبات", "support_requests"),
      metric("الطلبات الجديدة", "support_requests", {
        status: "new",
      }),
      metric("قيد المعالجة", "support_requests", {
        status: "in-progress",
      }),
      metric("الطلبات المحلولة", "support_requests", {
        status: "resolved",
      }),
      metric("إجمالي الردود", "support_replies"),
    ]),

    // Group chat — aggregate counts only
    Promise.all([
      metric("المحادثات الجماعية", "chat_threads"),
      metric("الرسائل", "chat_messages"),
      metric("عضويات المحادثات", "chat_participants"),
    ]),
  ]);

  const titles = [
    "المستخدمون والحسابات",
    "المحتوى التعليمي",
    "اشتراكات المقررات",
    "المدرسون وطلبات التقديم",
    "المجموعات التعليمية",
    "الحصص الدراسية",
    "الحضور والغياب",
    "الواجبات والتقييمات",
    "خدمة العملاء والدعم الفني",
    "المحادثات الجماعية",
  ];

  // Owner-only metrics
  const ownerSections = canManagePlatform
    ? await Promise.all([
        Promise.all([
          metric("المالكون", "account_roles", {
            role_code: "owner",
          }),
          metric("الإدارة", "account_roles", {
            role_code: "admin",
          }),
          metric("المديرون", "account_roles", {
            role_code: "manager",
          }),
          metric("الدعم الفني", "account_roles", {
            role_code: "support",
          }),
          metric("خدمة العملاء", "account_roles", {
            role_code: "customer_service",
          }),
          metric("العمليات الإدارية", "owner_account_activity"),
          metric("نشاط خدمة العملاء", "support_request_activity"),
        ]),

        Promise.all([
          metric("إجمالي عمليات الدفع", "group_payments"),
          metric("عمليات الدفع الناجحة", "group_payments", {
            status: "succeeded",
          }),
          metric("عمليات الدفع المعلقة", "group_payments", {
            status: "pending",
          }),
          metric("عمليات الدفع الفاشلة", "group_payments", {
            status: "failed",
          }),
          metric("عمليات الاسترداد", "group_payments", {
            status: "refunded",
          }),
          metric("سجلات مستحقات المدرسين", "teacher_earnings"),
        ]),
      ])
    : [];

  const queues = [
    {
      label: "طلبات الالتحاق",
      count: sections[2][2].value,
      href: "/admin/catalog?tab=enrollments",
    },
    {
      label: "طلبات المدرسين",
      count: sections[3][2].value,
      href: "/admin/teacher-applications?filter=pending",
    },
  ];

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="dashboard-width space-y-8 pt-5 pb-10"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold sm:text-3xl">
            نظرة عامة على المنصة
          </h1>

          <p className="text-sm text-muted-foreground">
            إحصائيات منصة LiveSchool من قاعدة البيانات
          </p>
        </div>

        {canManagePlatform && (
          <Button
            variant="outline"
            className="min-h-11"
            asChild
          >
            <Link href="/admin/settings">
              <Settings aria-hidden="true" />
              إعدادات المنصة
            </Link>
          </Button>
        )}
      </header>

      {/* Pending review requests */}

      <section
        className="space-y-3"
        aria-labelledby="admin-review-title"
      >
        <h2
          id="admin-review-title"
          className="text-lg font-bold"
        >
          طلبات قيد المراجعة
        </h2>

        <ul className="grid gap-3 sm:grid-cols-2">
          {queues.map(({ label, count, href }) => (
            <li key={href}>
              <Link
                href={href}
                className="soft-card flex min-h-20 items-center justify-between gap-3 p-4 hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <span className="grid gap-1">
                  <span className="font-bold">
                    {label}
                  </span>

                  <span className="text-sm text-muted-foreground">
                    {count == null
                      ? "العدد غير متاح حاليًا"
                      : `عدد الطلبات المعلقة ${count.toLocaleString("ar-EG")}`}
                  </span>
                </span>

                <ArrowLeft
                  className="size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* General dashboard sections */}

      {sections.map((items, index) => (
        <section
          key={titles[index]}
          className="space-y-3"
          aria-labelledby={`dashboard-section-${index}`}
        >
          <h2
            id={`dashboard-section-${index}`}
            className="text-lg font-bold"
          >
            {titles[index]}
          </h2>

          <PortalMetrics items={items} />
        </section>
      ))}

      {/* Owner administration */}

      {canManagePlatform && (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-bold">
              إدارة الموظفين والصلاحيات
            </h2>

            <PortalMetrics items={ownerSections[0]} />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold">
              الإحصائيات المالية
            </h2>

            <PortalMetrics items={ownerSections[1]} />
          </section>
        </>
      )}

      <footer className="border-t pt-4 text-sm text-muted-foreground">
        آخر تحميل للبيانات:{" "}
        {new Date().toLocaleString("ar-EG", {
          timeZone: "Africa/Cairo",
        })}
      </footer>
    </main>
  );
}