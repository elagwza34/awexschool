"use client";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import { usePortalPreview } from "./preview-context";
import { getSubject } from "@/features/catalog/mock-data";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { Badge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  MetricCards,
  Panel,
  ReviewTable,
  TeacherCourses,
  WeeklyChart,
} from "./dashboard-panels";
import {
  getDashboardProfile,
  teacherReviews,
  weeklyActivity,
} from "./mock-data";
import {
  TeacherProfileSummary,
  TeacherSchedulePreview,
} from "./teacher-profile-summary";
import {
  teacherSections,
  type TeacherOverviewSection,
} from "./teacher-navigation";

export function TeacherView({
  section = "overview",
}: {
  section?: TeacherOverviewSection;
}) {
  const { teacherProfile } = usePortalPreview();
  const { getTeacherCourses, groups, assignments } = useEnrollmentPreview();
  const profile = getDashboardProfile("teacher");
  const assigned = getTeacherCourses("ahmed-hassan");
  const studentCount = new Set(
    groups
      .filter(
        (group) =>
          group.active && assignments[group.courseId] === "ahmed-hassan",
      )
      .flatMap((group) => group.studentIds),
  ).size;
  const metrics = profile.metrics.map((metric, index) =>
    index === 0
      ? { ...metric, value: String(assigned.length), note: "حسب إسناد الإدارة" }
      : index === 1
        ? { ...metric, value: String(studentCount) }
        : index === 3
          ? {
              ...metric,
              value: String(
                assigned.reduce(
                  (sum, course) =>
                    sum +
                    course.units.reduce(
                      (count, unit) => count + unit.lessons.length,
                      0,
                    ),
                  0,
                ),
              ),
              note: `${assigned.reduce((sum, course) => sum + course.units.length, 0)} وحدات تعليمية`,
            }
          : metric,
  );
  const active = teacherSections.find((item) => item.id === section)!;
  const descriptions: Record<TeacherOverviewSection, string> = {
    overview: profile.description,
    courses: "مقرراتك المسندة في صفحة مستقلة، مع روابط لمعاينة محتواها.",
    schedule:
      "كل مواعيدك الأسبوعية في مكان واحد، بما فيها الحصص التي تنشئها في المعاينة.",
    progress: "نظرة مستقلة على النشاط التعليمي التوضيحي لطلاب مجموعاتك.",
    reviews: "أعمال الطلاب المنتظرة للمراجعة، مع تصفية الحالات في صفحة مستقلة.",
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <Badge className="mb-3 bg-white text-muted-foreground">
            {getSubject(teacherProfile.specialization)?.name}
          </Badge>
          <h1 className="text-2xl font-bold leading-relaxed sm:text-3xl">
            {section === "overview" ? profile.greeting : active.label}
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            {descriptions[section]}
          </p>
        </div>
        {section === "overview" && (
          <Button asChild>
            <Link href="/teacher/sessions">
              إنشاء حصة
              <CalendarDays aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
      {section === "overview" && (
        <>
          <MetricCards metrics={metrics} />
          <TeacherProfileSummary />
          <Panel
            title="مساحاتك كمدرس"
            subtitle="كل قسم له صفحة مستقلة في التابات بالأعلى"
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {teacherSections
                .filter(
                  (item) => item.id !== "overview" && item.id !== "profile",
                )
                .map((item) => (
                  <Link
                    href={item.href}
                    key={item.id}
                    className="flex min-h-18 items-center justify-between gap-3 rounded-xl border p-4 text-sm font-bold transition-colors hover:border-primary"
                  >
                    {item.label}
                    <ArrowLeft
                      aria-hidden="true"
                      className="size-4 shrink-0 text-primary"
                    />
                  </Link>
                ))}
            </div>
          </Panel>
        </>
      )}
      {section === "courses" && <TeacherCourses />}
      {section === "schedule" && <TeacherSchedulePreview />}
      {section === "progress" && (
        <WeeklyChart
          title="نشاط طلاب المجموعات"
          data={weeklyActivity}
          subtitle="دقائق تعلّم افتراضية لمعاينة التقرير"
        />
      )}
      {section === "reviews" && (
        <ReviewTable title="أعمال تنتظر نظرتك" items={teacherReviews} />
      )}
    </div>
  );
}
