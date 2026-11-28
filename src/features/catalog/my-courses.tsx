import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalMetrics } from "@/components/layout/portal-metrics";
import { getAccount } from "@/features/auth/supabase-server";
import { isPreviewFixtureEnvironment } from "@/lib/environment";
import { getCourseEnrollments } from "./enrollment-actions";
import { listPublishedCourses } from "./live-catalog";
import { getMockCourses, getMockEnrollments } from "./mock-data";

type Enrollment = {
  course_id: string;
  learner_name: string | null;
  status: string;
  student?: { display_name: string } | null;
  student_id?: string | null;
  requester_id?: string;
};

type Course = {
  id: string;
  title: string;
};

const enrollmentStatuses: Record<string, string> = {
  active: "التحاق مؤكد",
  pending: "قيد المراجعة",
  declined: "الطلب مرفوض",
};

export async function MyCourses({
  role,
  overview = false,
}: {
  role: "student" | "parent";
  overview?: boolean;
}) {
  const account = await getAccount();

  if (!account) {
    redirect("/login");
  }

  if (!account.roles.includes(role)) {
    redirect("/account?message=portal-denied");
  }

  const preview = isPreviewFixtureEnvironment();

  let requests: Enrollment[] = [];
  let courses: Course[] = [];

  let enrollmentError = false;
  let catalogError = false;
  let usingFixtures = false;

  const [enrollmentResult, catalogResult] =
    await Promise.allSettled([
      getCourseEnrollments(),
      listPublishedCourses(),
    ]);

  if (
    enrollmentResult.status === "fulfilled" &&
    enrollmentResult.value.state === "ready"
  ) {
    requests = enrollmentResult.value.data;
  } else {
    enrollmentError = true;
  }

  if (
    catalogResult.status === "fulfilled" &&
    catalogResult.value.state === "ready"
  ) {
    courses = catalogResult.value.data;
  } else {
    catalogError = true;
  }

  // Never mix live enrollments with fictional enrollments.
  // Fixtures are available only during explicit test previews.
  if (preview && enrollmentError) {
    requests = getMockEnrollments();
    courses = getMockCourses();
    usingFixtures = true;
  }

  const titles = new Map(
    courses.map(({ id, title }) => [id, title])
  );

  const unavailable = enrollmentError && !usingFixtures;

  const metrics = [
    {
      label: "إجمالي طلبات الالتحاق",
      value: unavailable ? null : requests.length,
    },
    {
      label: "التحاقات مؤكدة",
      value: unavailable
        ? null
        : requests.filter(
            ({ status }) => status === "active"
          ).length,
    },
    {
      label: "قيد المراجعة",
      value: unavailable
        ? null
        : requests.filter(
            ({ status }) => status === "pending"
          ).length,
    },
    {
      label: "الطلبات المرفوضة",
      value: unavailable
        ? null
        : requests.filter(
            ({ status }) => status === "declined"
          ).length,
    },
  ];

  return (
    <main
      id="main-content"
      className="dashboard-width space-y-4 pt-5 pb-10"
    >
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">
          مقرراتي
        </h1>

        <p className="text-sm text-muted-foreground">
          متابعة المقررات وطلبات الالتحاق
          وحالة الاشتراكات الدراسية.
        </p>
      </header>

      {enrollmentError && (
        <div
          role="alert"
          className="soft-card space-y-2 p-5"
        >
          <h2 className="font-bold">
            تعذّر تحميل طلبات الالتحاق
          </h2>

          <p className="text-sm text-muted-foreground">
            برجاء إعادة تحميل الصفحة والمحاولة مرة أخرى.
          </p>
        </div>
      )}

      {usingFixtures && (
        <p
          role="status"
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm"
        >
          بيانات تجريبية للمعاينة فقط.
          لا تمثل اشتراكات حقيقية.
        </p>
      )}

      {overview && <PortalMetrics items={metrics} />}

      <Link
        href="/courses"
        className="inline-flex min-h-11 items-center font-semibold text-primary underline"
      >
        تصفّح المقررات
      </Link>

      {!unavailable && (
        <>
          {catalogError &&
            !usingFixtures &&
            requests.length > 0 && (
              <p
                role="alert"
                className="soft-card p-4 text-sm"
              >
                تعذّر تحميل أسماء المقررات حاليًا،
                ولكن بيانات الالتحاق متاحة.
              </p>
            )}

          {requests.length ? (
            <ul className="grid gap-3">
              {requests.map((request, index) => {
                const {
                  course_id,
                  learner_name,
                  status,
                  student,
                  student_id,
                  requester_id,
                } = request;

                // Prefer authoritative student identity.
                // Retain legacy names only for unresolved legacy rows.
                const learnerName =
                  student?.display_name?.trim() ||
                  (student_id == null
                    ? learner_name?.trim()
                    : null) ||
                  "غير محدد";

                const courseTitle =
                  titles.get(course_id);

                return (
                  <li
                    key={`${course_id}-${requester_id ?? index}-${student_id ?? "legacy"}`}
                    className="soft-card space-y-3 p-4"
                  >
                    {courseTitle && !usingFixtures ? (
                      <Link
                        href={`/courses/${encodeURIComponent(course_id)}`}
                        className="font-bold text-primary underline"
                      >
                        {courseTitle}
                      </Link>
                    ) : (
                      <h2 className="font-bold">
                        {courseTitle ??
                          "اسم المقرر غير متاح حاليًا"}
                      </h2>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">
                        الطالب: {learnerName}
                      </p>

                      <span
                        className={`rounded-md px-3 py-1 text-sm font-semibold ${
                          status === "active"
                            ? "bg-green-500/10 text-green-600"
                            : status === "declined"
                              ? "bg-red-500/10 text-red-600"
                              : status === "pending"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {enrollmentStatuses[status] ??
                          "حالة غير معروفة"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="soft-card space-y-2 p-6">
              <h2 className="font-bold">
                لا توجد مقررات مسجلة
              </h2>

              <p className="text-sm text-muted-foreground">
                يمكنك تصفّح المقررات المتاحة
                وإرسال طلب الالتحاق بالمقرر المناسب.
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}