"use client";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import { StudentGroupsSummary } from "@/features/enrollments/workspace";
import { EmptyState } from "@/components/shared";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  Lightbulb,
  MessagesSquare,
} from "lucide-react";
import {
  ContinueLearning,
  LearningCards,
  MetricCards,
  Panel,
  ProgressBar,
  WeeklyChart,
} from "./dashboard-panels";
import { getDashboardProfile, weeklyActivity } from "./mock-data";
import { studentSections, type StudentSection } from "./student-navigation";
import { StudentCalendar } from "./student-calendar";
import { StudentHeading } from "./student-heading";

function WeeklyGoal() {
  const minutes = weeklyActivity.reduce((sum, day) => sum + day.minutes, 0);
  const goal = 180;
  return (
    <Panel title="هدف بسيط.. أثر كبير" subtitle="هدف أسبوعي توضيحي">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-secondary">
          <Lightbulb aria-hidden="true" className="size-6 text-primary" />
        </span>
        <p className="text-sm font-bold">قرّب من هدفك، على مهلك.</p>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        {minutes} من {goal} دقيقة تعلّم
      </p>
      <ProgressBar
        value={(minutes / goal) * 100}
        label="الهدف الأسبوعي التوضيحي"
      />
      <p className="mt-4 text-xs leading-7 text-muted-foreground">
        {goal - minutes} دقيقة كمان وخطوتك تكمل. الأهم هو الفهم، مش السرعة.
      </p>
    </Panel>
  );
}

export function StudentView({
  section = "overview",
}: {
  section?: Exclude<
    StudentSection,
    "profile" | "chat" | "admin-chat" | "attendance" | "assignments" | "library"
  >;
}) {
  const { getStudentCourses, resolveCourse } = useEnrollmentPreview();
  const studentCourses = getStudentCourses("youssef");
  const profile = getDashboardProfile("student");
  const metrics = profile.metrics.map((metric, index) =>
    index === 0
      ? {
          ...metric,
          value: new Intl.NumberFormat("ar-EG").format(studentCourses.length),
        }
      : index === 1
        ? {
            ...metric,
            value: new Intl.NumberFormat("ar-EG").format(
              studentCourses.reduce((sum, course) => sum + course.completed, 0),
            ),
            note: `من أصل ${studentCourses.reduce((sum, course) => sum + course.total, 0)} درسًا`,
          }
        : metric,
  );
  const heading = studentSections.find((item) => item.id === section)!;
  const descriptions: Record<
    Exclude<
      StudentSection,
      | "profile"
      | "chat"
      | "admin-chat"
      | "attendance"
      | "assignments"
      | "library"
    >,
    string
  > = {
    overview: profile.description,
    courses:
      "مقرراتك في مكان واحد. اختار المادة وكمّل معاينة الدرس من آخر خطوة.",
    progress:
      "اعرف خطواتك في المقررات، وشوف وقت التعلّم وهدفك الأسبوعي في مساحة مستقلة.",
    schedule:
      "مواعيدك الأسبوعية مرتبة في صفحة واحدة. كل المواعيد هنا أمثلة توضيحية.",
  };
  return (
    <div className="space-y-4">
      <StudentHeading
        title={heading.label}
        description={descriptions[section]}
        overview={section === "overview"}
      />
      {section === "overview" && (
        <>
          <MetricCards metrics={metrics} />
          {studentCourses[0] ? (
            <ContinueLearning entry={studentCourses[0]} />
          ) : (
            <EmptyState title="لا توجد مقررات مرتبطة بك حاليًا" />
          )}
          <Panel
            title="كل خطوة، ليها مساحتها"
            subtitle="اختار القسم من التابات بالأعلى، أو افتحه مباشرة من هنا"
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {studentSections
                .filter(
                  (item) =>
                    item.id !== "overview" &&
                    item.id !== "profile" &&
                    item.id !== "chat",
                )
                .map((item) => {
                  const Icon = {
                    courses: BookOpen,
                    progress: ChartNoAxesCombined,
                    schedule: CalendarDays,
                    "admin-chat": MessagesSquare,
                    attendance: CalendarDays,
                    assignments: BookOpen,
                    library: BookOpen,
                  }[item.id];
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="section-shortcut rounded-xl border p-3 transition-colors hover:border-primary"
                    >
                      <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <h2 className="text-sm font-semibold">{item.label}</h2>
                      <span className="flex min-h-11 items-center gap-2 text-xs font-bold text-primary">
                        افتح القسم
                        <ArrowLeft aria-hidden="true" className="size-3.5" />
                      </span>
                    </Link>
                  );
                })}
            </div>
          </Panel>
        </>
      )}
      {section === "courses" && (
        <Panel
          title="مقرراتك، وخطوتك الجاية"
          subtitle="تقدّم افتراضي للتعرّف على الواجهة"
        >
          <LearningCards entries={studentCourses} />
          <div className="mt-4">
            <StudentGroupsSummary showChat />
          </div>
        </Panel>
      )}
      {section === "progress" && (
        <>
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <WeeklyChart data={weeklyActivity} />
            <WeeklyGoal />
          </div>
          <Panel
            title="التقدّم في كل مقرر"
            subtitle="القيم للعرض فقط؛ لا تُسجّل دروس أو درجات فعلية"
          >
            <div className="grid gap-4 md:grid-cols-3">
              {studentCourses.map((entry) => {
                const course = resolveCourse(entry.courseId)!;
                const value = entry.total
                  ? Math.round((entry.completed / entry.total) * 100)
                  : 0;
                return (
                  <div className="rounded-xl border p-4" key={entry.courseId}>
                    <h2 className="mb-4 text-sm font-bold">{course.title}</h2>
                    <div className="mb-3 flex justify-between text-xs text-muted-foreground">
                      <span>
                        {entry.completed} من {entry.total} دروس
                      </span>
                      <span>{value}٪</span>
                    </div>
                    <ProgressBar value={value} label={`تقدم ${course.title}`} />
                  </div>
                );
              })}
            </div>
          </Panel>
        </>
      )}
      {section === "schedule" && <StudentCalendar />}
    </div>
  );
}
