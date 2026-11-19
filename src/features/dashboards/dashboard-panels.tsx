"use client";
import { TeacherAvatar } from "@/components/teacher-avatar";
import { portalCourseHref } from "@/features/content/routes";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import { AccountEditor } from "@/features/enrollments/account-editor";
import { TeacherProfileDetails } from "@/features/teachers/profile-details";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpLeft,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  Clock3,
  FileText,
  GraduationCap,
  Play,
  Search,
  Users,
} from "lucide-react";
import { Badge, EmptyState, tones } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { DemoDialog } from "@/components/demo-dialog";
import { getGrade, getSubject, getTeacher } from "@/features/catalog/mock-data";
import { normalizeArabic } from "@/features/catalog/service";
import { cn } from "@/lib/utils";
import { schedule } from "./mock-data";
import type {
  DashboardMetric,
  DashboardRole,
  LearningCourse,
  MetricIcon,
  ReviewItem,
  ScheduleItem,
  TimelineItem,
  WeeklyActivity,
} from "./types";

const metricIcons: Record<MetricIcon, typeof BookOpen> = {
  courses: BookOpen,
  students: Users,
  time: Clock3,
  complete: CheckCheck,
  review: FileText,
  teachers: GraduationCap,
};

export function Panel({
  title,
  subtitle,
  action,
  children,
  id,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("soft-card panel-space min-w-0 scroll-mt-6", className)}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function MetricCards({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3",
        metrics.length === 3 ? "xl:grid-cols-3" : "xl:grid-cols-4",
      )}
    >
      {metrics.map((metric) => {
        const Icon = metricIcons[metric.icon];
        return (
          <div key={metric.label} className="soft-card p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                {metric.label}
              </span>
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl",
                  tones[metric.tone],
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
              </span>
            </div>
            <p className="mb-1 mt-2 break-words text-xl font-bold sm:text-2xl">
              {metric.value}
            </p>
            <p className="text-[11px] text-muted-foreground">{metric.note}</p>
          </div>
        );
      })}
    </div>
  );
}
export function ProgressBar({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 overflow-hidden rounded-full bg-[#e6ece3]", className)}
    >
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
export function LearningCards({
  entries,
  parentView = false,
  studentId,
}: {
  entries: LearningCourse[];
  parentView?: boolean;
  studentId?: string;
}) {
  const { resolveCourse } = useEnrollmentPreview();
  return (
    <div className="grid gap-3 xl:grid-cols-3">
      {entries.map((entry) => {
        const course = resolveCourse(entry.courseId)!;
        const subject = getSubject(course.subjectId)!;
        const teacher = getTeacher(course.teacherId)!;
        const percent = entry.total
          ? Math.round((entry.completed / entry.total) * 100)
          : 0;
        return (
          <article
            key={entry.courseId}
            className="overflow-hidden rounded-xl border"
          >
            <div
              className={cn(
                "relative flex h-26 items-center justify-center",
                tones[subject.tone],
              )}
            >
              <span
                aria-hidden="true"
                className="font-serif text-4xl"
                dir="ltr"
              >
                {subject.symbol}
              </span>
              <span className="absolute end-3 top-3 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-bold">
                {subject.name}
              </span>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-semibold">
                <Link
                  href={portalCourseHref(
                    parentView ? "parent" : "student",
                    course.id,
                    studentId,
                  )}
                  className="hover:text-primary"
                >
                  {course.title}
                </Link>
              </h3>
              <p className="mb-4 mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                <TeacherAvatar teacherId={teacher.id} className="size-6" />
                أ. {teacher.name}
              </p>
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">
                  {entry.completed} من {entry.total} دروس
                </span>
                <span className="font-bold text-primary">{percent}٪</span>
              </div>
              <ProgressBar value={percent} label={`تقدم ${course.title}`} />
              <Link
                className="mt-4 flex min-h-11 items-center justify-between border-t pt-3 text-xs font-bold text-primary"
                href={portalCourseHref(
                  parentView ? "parent" : "student",
                  course.id,
                  studentId,
                  parentView ? undefined : course.units[0]?.lessons[0]?.id,
                )}
              >
                {parentView ? "تعرّف على المقرر" : "أكمل معاينة الدرس"}
                <ArrowLeft aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
export function WeeklyChart({
  data,
  title = "خطواتك خلال الأسبوع",
  noun = "دقيقة",
  subtitle = "وقت تعلّم توضيحي · لا توجد متابعة فعلية",
}: {
  data: WeeklyActivity[];
  title?: string;
  noun?: string;
  subtitle?: string;
}) {
  const [period, setPeriod] = useState("current");
  const values =
    period === "current"
      ? data
      : data.map((d, i) => ({
          ...d,
          minutes: Math.max(0, d.minutes - ((i % 3) + 1) * 3),
        }));
  const max = Math.max(40, ...values.map((d) => d.minutes));
  const total = values.reduce((n, d) => n + d.minutes, 0);
  return (
    <Panel
      id="reports"
      title={title}
      subtitle={subtitle}
      action={
        <select
          aria-label="فترة النشاط"
          className="min-h-11 rounded-lg border bg-white px-2 text-xs"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="current">هذا الأسبوع</option>
          <option value="previous">الأسبوع السابق</option>
        </select>
      }
    >
      <div className="mb-4 flex items-end gap-2">
        <p className="text-3xl font-bold">{total}</p>
        <p className="pb-1 text-xs text-muted-foreground">{noun} · نموذج</p>
      </div>
      <ul
        aria-label="توزيع النشاط على أيام الأسبوع"
        className="grid h-43 grid-cols-7 gap-2 border-b sm:gap-3"
      >
        {values.map((day, i) => (
          <li
            key={day.day}
            className="flex min-w-0 flex-col items-center justify-end gap-2"
          >
            <span className="text-[10px] font-bold text-muted-foreground">
              {day.minutes}
            </span>
            <div
              aria-hidden="true"
              className={cn(
                "w-full max-w-9 rounded-t-md",
                i === 1 ? "bg-primary" : "bg-[#d8e6cf]",
              )}
              style={{ height: `${Math.max(3, (day.minutes / max) * 105)}px` }}
            />
            <span className="pb-2 text-[9px] text-muted-foreground sm:text-[10px]">
              {day.day}
            </span>
            <span className="sr-only">
              {day.minutes} {noun}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ArrowUpLeft aria-hidden="true" className="size-3.5 text-primary" />
        كل خطوة لها أثر. القيم للعرض فقط.
      </p>
    </Panel>
  );
}
export function SchedulePanel({
  entries = schedule,
}: {
  entries?: ScheduleItem[];
}) {
  return (
    <Panel
      id="schedule"
      title="على جدولك"
      subtitle="مواعيد أسبوعية توضيحية"
      action={
        <CalendarDays
          aria-hidden="true"
          className="size-5 text-muted-foreground"
        />
      }
    >
      <div className="space-y-4">
        {entries.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 border-b pb-4 last:border-b-0 last:pb-0"
          >
            <div
              className={cn(
                "flex min-h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl",
                tones[item.tone],
              )}
            >
              <span className="text-[10px] font-bold">{item.day}</span>
              <span className="text-[10px]" dir="auto">
                {item.time}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold leading-6">{item.title}</h3>
              <p className="mt-1 text-[10px] leading-6 text-muted-foreground">
                {item.subtitle}
              </p>
              <p className="text-[10px] text-primary">
                موعد توضيحي · بدون حصة مباشرة
              </p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
export function ActivityPanel({
  entries,
  title = "آخر الخطوات",
  id = "activity",
}: {
  entries: TimelineItem[];
  title?: string;
  id?: string;
}) {
  return (
    <Panel id={id} title={title} subtitle="سجل تجريبي، وليس نشاطًا حقيقيًا">
      <ol className="space-y-4">
        {entries.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                tones[item.tone],
              )}
            >
              <Check aria-hidden="true" className="size-3.5" />
            </span>
            <div>
              <p className="text-xs font-bold">{item.title}</p>
              <p className="my-1 text-[11px] leading-6 text-muted-foreground">
                {item.detail}
              </p>
              <p className="text-[10px] text-muted-foreground">{item.time}</p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
export function TeacherCourses() {
  const { getTeacherCourses, groups } = useEnrollmentPreview();
  const assigned = getTeacherCourses("ahmed-hassan");
  return (
    <Panel
      id="courses"
      title="مقرراتك.. مساحة لأفكارك"
      subtitle="مقررات نموذجية مسندة لأ. أحمد حسن"
    >
      {!assigned.length && (
        <p role="status" className="py-4 text-sm text-muted-foreground">
          لا توجد مقررات مسندة إليك حاليًا.
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {assigned.map((course) => {
          const id = course.id;
          const students = new Set(
            groups
              .filter((group) => group.active && group.courseId === id)
              .flatMap((group) => group.studentIds),
          );
          return (
            <article className="rounded-xl border p-4" key={id}>
              <div className="mb-4 flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                  <BookOpen aria-hidden="true" className="size-5" />
                </span>
                <Badge>نموذج منشور</Badge>
              </div>
              <h3 className="text-sm font-semibold">{course.title}</h3>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {getGrade(course.gradeId)?.name} · {students.size} طالبًا
                افتراضيًا
              </p>
              <div className="my-4 flex justify-between border-y py-3 text-xs text-muted-foreground">
                <span>{course.units.length} وحدات</span>
                <span>
                  {course.units.reduce(
                    (sum, unit) => sum + unit.lessons.length,
                    0,
                  )}{" "}
                  دروس
                </span>
              </div>
              <Button variant="outline" asChild className="w-full text-xs">
                <Link href={portalCourseHref("teacher", id)}>
                  معاينة المقرر
                  <ArrowLeft aria-hidden="true" />
                </Link>
              </Button>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}
export function ReviewTable({
  items,
  title,
  id = "activity",
}: {
  items: ReviewItem[];
  title: string;
  id?: string;
}) {
  const [status, setStatus] = useState("all");
  const filtered = items.filter(
    (item) =>
      status === "all" ||
      (status === "pending"
        ? item.status === "قيد المراجعة"
        : item.status === "تمت المراجعة"),
  );
  return (
    <Panel
      id={id}
      title={title}
      subtitle="نماذج للعرض فقط؛ لا يوجد تصحيح أو نشر فعلي"
      action={
        <select
          aria-label="حالة المراجعة"
          className="min-h-11 rounded-lg border bg-white px-2 text-xs"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">كل الحالات</option>
          <option value="pending">قيد المراجعة</option>
          <option value="done">تمت المراجعة</option>
        </select>
      }
    >
      {filtered.length ? (
        <div
          className="overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="جدول المراجعات القابل للتمرير"
        >
          <table className="w-full min-w-[520px] text-start text-xs">
            <caption className="sr-only">{title} — بيانات افتراضية</caption>
            <thead className="border-b text-muted-foreground">
              <tr>
                <th scope="col" className="pb-3 text-start font-semibold">
                  المحتوى
                </th>
                <th scope="col" className="pb-3 text-start font-semibold">
                  صاحب العمل
                </th>
                <th scope="col" className="pb-3 text-start font-semibold">
                  الحالة
                </th>
                <th scope="col" className="pb-3 text-start font-semibold">
                  المعاينة
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr className="border-b last:border-b-0" key={item.id}>
                  <td className="py-4 pe-4">
                    <p className="font-bold">{item.title}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {item.category}
                    </p>
                  </td>
                  <td className="pe-3">{item.owner}</td>
                  <td className="pe-3">
                    <Badge
                      className={
                        item.status === "قيد المراجعة"
                          ? "bg-[#fbefdd] text-[#86521f]"
                          : ""
                      }
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td>
                    <DemoDialog
                      label="عرض"
                      title={item.title}
                      description={`${item.owner} · ${item.category}. هذا مثال لواجهة المراجعة فقط؛ لم يتم فتح ملف أو تصحيح عمل أو تغيير حالة المحتوى.`}
                      className="min-h-11 bg-secondary px-3 text-xs text-primary hover:bg-accent"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="لا توجد عناصر بهذه الحالة"
          description="جرّب اختيار حالة مختلفة لعرض البيانات التجريبية."
          href="/dashboards"
          action="استكشف اللوحات"
        />
      )}
    </Panel>
  );
}
export function UsersTable({ role, actor = "admin" }: { role?: string; actor?: DashboardRole }) {
  const { accounts, teacherProfiles } = useEnrollmentPreview();
  const [query, setQuery] = useState("");
  const filtered = accounts.filter(
    (user) =>
      (!role || user.role === role) &&
      normalizeArabic(`${user.name} ${user.email} ${user.role}`).includes(
        normalizeArabic(query),
      ),
  );
  return (
    <div>
      <label
        htmlFor="demo-user-search"
        className="mb-2 flex items-center gap-2 text-xs font-bold"
      >
        <Search aria-hidden="true" className="size-4" />
        ابحث في مستخدمي المعاينة
      </label>
      <input
        id="demo-user-search"
        className="field mb-4 text-sm"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        maxLength={80}
        type="search"
        placeholder="اسم، بريد، أو دور..."
      />
      <p role="status" className="mb-3 text-xs text-muted-foreground">
        {filtered.length} مستخدمين في النتائج
      </p>
      {filtered.length ? (
        <div
          className="overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="جدول المستخدمين القابل للتمرير"
        >
          <table className="w-full min-w-[570px] text-xs">
            <caption className="sr-only">المستخدمون التجريبيون</caption>
            <thead className="border-b text-muted-foreground">
              <tr>
                {["المستخدم", "الدور", "الحالة", "التفاصيل"].map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="pb-3 text-start font-semibold"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="py-4 pe-4">
                    <p className="font-bold">{user.name}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      <bdi>{user.email}</bdi>
                    </p>
                  </td>
                  <td className="pe-3">{user.role}</td>
                  <td className="pe-3">
                    <Badge
                      className={
                        user.status === "نشط"
                          ? ""
                          : "bg-[#fbefdd] text-[#86521f]"
                      }
                    >
                      {user.status}
                    </Badge>
                  </td>
                  <td>
                    <DemoDialog
                      label="عرض"
                      title={`ملف ${user.name}`}
                      description={`الدور التوضيحي: ${user.role}. لا يوجد حساب حقيقي، وتعديل البيانات من زر التعديل محلي فقط.`}
                      className="min-h-11 bg-secondary px-3 text-xs text-primary hover:bg-accent"
                    />
                    <div className="mt-2">
                      <AccountEditor account={user} actor={actor} />
                    </div>
                    {teacherProfiles[user.entityId] && (
                      <details className="my-2">
                        <summary className="min-h-11 cursor-pointer py-3 font-semibold">الملف المهني</summary>
                        <TeacherProfileDetails profile={teacherProfiles[user.entityId]} />
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-7 text-center text-sm text-muted-foreground">
          {query.trim() ? "لا توجد نتائج مطابقة. امسح البحث لعرض كل المستخدمين." : "مفيش مستخدمين في الدور ده لسه."}
          {query.trim() && (
            <Button variant="outline" className="mx-auto mt-3 flex" onClick={() => setQuery("")}>
              مسح البحث
            </Button>
          )}
        </p>
      )}
    </div>
  );
}
export function ContinueLearning({ entry }: { entry: LearningCourse }) {
  const { resolveCourse } = useEnrollmentPreview();
  const course = resolveCourse(entry.courseId)!;
  const subject = getSubject(course.subjectId)!;
  const teacher = getTeacher(course.teacherId)!;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#d5e2ca] bg-white p-4 sm:p-6">
      <div className="relative">
        <Badge className="bg-white/80">نكمّل من هنا؟</Badge>
        <h2 className="mb-3 mt-4 text-xl font-semibold">{entry.nextLesson}</h2>
        <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <TeacherAvatar teacherId={teacher.id} className="size-6" />
          {subject.name} · أ. {teacher.name} · معاينة نصية تفاعلية
        </p>
        <Button asChild>
          <Link
            href={portalCourseHref(
              "student",
              course.id,
              undefined,
              course.units[0]?.lessons[0]?.id,
            )}
          >
            <Play aria-hidden="true" className="fill-current" />
            كمّل رحلة الفهم
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
