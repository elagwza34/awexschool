"use client";
import { TeacherAvatar } from "@/components/teacher-avatar";
import { portalCourseHref } from "@/features/content/routes";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  Video,
} from "lucide-react";
import { Badge, tones } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSubject } from "@/features/catalog/mock-data";
import { cn } from "@/lib/utils";
import {
  calendarDateLabel,
  calendarEventLanes,
  calendarLessons,
  calendarMinutes,
  calendarReferenceDate,
  calendarTime,
  calendarWeekStart,
  shiftCalendarDate,
  type CalendarLesson,
} from "./calendar-data";
import { providerNames } from "./management-fixtures";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import { usePortalPreview } from "./preview-context";
import { attendanceLabels } from "@/features/sessions/logic";

export function DashboardCalendar({
  role = "student",
  studentId = "youssef",
  id,
}: {
  role?: "student" | "parent" | "teacher" | "admin";
  studentId?: string;
  id?: string;
}) {
  const [date, setDate] = useState(calendarReferenceDate);
  const [view, setView] = useState<"week" | "day">("week");
  const [courseId, setCourseId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [teacherFilter, setTeacherFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const { sessions, teacherProfile, attendance } = usePortalPreview();
  const { getStudentCourses, getTeacherCourses, resolveCourse, accounts } =
    useEnrollmentPreview();
  const learner = role === "student" || role === "parent";
  const enrolledIds = learner
    ? getStudentCourses(studentId).map((course) => course.courseId)
    : getTeacherCourses("ahmed-hassan").map((course) => course.id);
  const temporary: CalendarLesson[] = sessions
    .filter(
      (session) =>
        role === "admin" ||
        (role === "teacher"
          ? session.teacherId === "ahmed-hassan"
          : session.studentIds.includes(studentId)),
    )
    .map((session) => ({
      ...session,
      teacherName: session.teacherName,
      source: "session-preview",
    }));
  const fixtureLessons = calendarLessons.map((lesson) => {
    const teacherId = resolveCourse(lesson.courseId)?.teacherId;
    const teacher = accounts.find(
      (account) => account.kind === "teacher" && account.entityId === teacherId,
    );
    return {
      ...lesson,
      teacherId,
      teacherName:
        teacherId === "ahmed-hassan"
          ? teacherProfile.displayName
          : `أ. ${teacher?.name ?? lesson.teacherName}`,
    };
  });
  const eligible = [
    ...fixtureLessons.filter(
      (lesson) => role === "admin" || enrolledIds.includes(lesson.courseId),
    ),
    ...temporary,
  ];
  const selected = eligible.find((lesson) => lesson.id === selectedId) ?? null;
  const allLessons = eligible.filter(
    (lesson) =>
      (!courseId || lesson.courseId === courseId) &&
      (!teacherFilter || lesson.teacherId === teacherFilter) &&
      (!groupFilter || lesson.groupId === groupFilter) &&
      (!statusFilter || (lesson.status ?? "scheduled") === statusFilter),
  );
  const calendarCourses = [
    ...new Set([...enrolledIds, ...eligible.map((lesson) => lesson.courseId)]),
  ].map((courseId) => ({ courseId }));
  const start = view === "week" ? calendarWeekStart(date) : date;
  const days = Array.from({ length: view === "week" ? 7 : 1 }, (_, i) =>
    shiftCalendarDate(start, i),
  );
  const visible = allLessons.filter((lesson) => days.includes(lesson.date));
  const firstHour = Math.min(
    14,
    ...visible.map((lesson) => Math.floor(calendarMinutes(lesson.time) / 60)),
  );
  const lastHour = Math.max(
    21,
    ...visible.map((lesson) =>
      Math.ceil((calendarMinutes(lesson.time) + lesson.duration) / 60),
    ),
  );
  const hours = Array.from(
    { length: lastHour - firstHour },
    (_, i) => firstHour + i,
  );
  const height = hours.length * 72;
  const title =
    view === "week"
      ? `${calendarDateLabel(days[0])} — ${calendarDateLabel(days[6], { day: "numeric", month: "long", year: "numeric" })}`
      : calendarDateLabel(date, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
  return (
    <section
      id={id}
      className="soft-card min-w-0 overflow-hidden"
      aria-label="كالندر الحصص"
    >
      <div className="border-b p-4 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CalendarDays
                aria-hidden="true"
                className="size-5 text-primary"
              />
              كالندر الحصص
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">{title}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label={view === "week" ? "الأسبوع السابق" : "اليوم السابق"}
              onClick={() =>
                setDate(shiftCalendarDate(date, view === "week" ? -7 : -1))
              }
            >
              <ChevronRight aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setDate(calendarReferenceDate)}
            >
              اليوم
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={view === "week" ? "الأسبوع التالي" : "اليوم التالي"}
              onClick={() =>
                setDate(shiftCalendarDate(date, view === "week" ? 7 : 1))
              }
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <div
              className="ms-1 flex rounded-xl border p-1"
              role="group"
              aria-label="طريقة عرض الكالندر"
            >
              <Button
                variant={view === "week" ? "default" : "ghost"}
                size="sm"
                aria-pressed={view === "week"}
                onClick={() => setView("week")}
              >
                أسبوع
              </Button>
              <Button
                variant={view === "day" ? "default" : "ghost"}
                size="sm"
                aria-pressed={view === "day"}
                onClick={() => setView("day")}
              >
                يوم
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label
              htmlFor="calendar-course"
              className="mb-2 block text-xs font-bold"
            >
              تصفية حسب المقرر
            </label>
            <select
              id="calendar-course"
              className="field text-sm"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">كل المقررات</option>
              {calendarCourses.map((entry) => (
                <option key={entry.courseId} value={entry.courseId}>
                  {resolveCourse(entry.courseId)?.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="calendar-date"
              className="mb-2 block text-xs font-bold"
            >
              انتقل إلى تاريخ
            </label>
            <input
              id="calendar-date"
              type="date"
              className="field text-sm"
              value={date}
              dir="ltr"
              onChange={(e) => {
                if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value))
                  setDate(e.target.value);
              }}
            />
          </div>
          <p role="status" className="pb-3 text-xs text-muted-foreground">
            {visible.length} حصص في {view === "week" ? "الأسبوع" : "اليوم"} ·
            توقيت القاهرة
          </p>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <Badge>عرض تجريبي · Africa/Cairo</Badge>
          <span>اضغط على الحصة لعرض التفاصيل.</span>
          <span className="md:hidden">
            اسحب الكالندر أفقيًا، أو اختار عرض اليوم.
          </span>
        </div>
        {role !== "student" && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {role === "admin" && (
              <div>
                <label
                  htmlFor="calendar-teacher"
                  className="mb-2 block text-xs font-bold"
                >
                  تصفية المدرس
                </label>
                <select
                  id="calendar-teacher"
                  className="field"
                  value={teacherFilter}
                  onChange={(e) => setTeacherFilter(e.target.value)}
                >
                  <option value="">كل المدرسين</option>
                  {[
                    ...new Map(
                      eligible.map((lesson) => [
                        lesson.teacherId,
                        lesson.teacherName,
                      ]),
                    ).entries(),
                  ].map(([value, name]) => (
                    <option key={value} value={value}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label
                htmlFor="calendar-group"
                className="mb-2 block text-xs font-bold"
              >
                تصفية المجموعة
              </label>
              <select
                id="calendar-group"
                className="field"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
              >
                <option value="">كل المجموعات</option>
                {[
                  ...new Map(
                    temporary.map((lesson) => [
                      lesson.groupId!,
                      lesson.groupName!,
                    ]),
                  ).entries(),
                ].map(([value, name]) => (
                  <option key={value} value={value}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="calendar-status"
                className="mb-2 block text-xs font-bold"
              >
                حالة الحصة
              </label>
              <select
                id="calendar-status"
                className="field"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">كل الحالات</option>
                <option value="scheduled">مجدولة</option>
                <option value="cancelled">ملغاة</option>
              </select>
            </div>
          </div>
        )}
      </div>
      {!visible.length && (
        <p
          role="status"
          className="border-b bg-secondary/40 px-4 py-4 text-sm text-muted-foreground"
        >
          لا توجد حصص في {view === "week" ? "هذا الأسبوع" : "هذا اليوم"}
          {courseId ? " للمقرر المختار" : ""}.
        </p>
      )}
      <div
        role="region"
        aria-label={
          view === "week"
            ? "تقويم الحصص الأسبوعي القابل للتمرير"
            : "تقويم حصص اليوم"
        }
        tabIndex={0}
        className="overflow-x-auto"
      >
        <div className={view === "week" ? "min-w-[1050px]" : "min-w-[300px]"}>
          <div
            className="grid border-b"
            style={{
              gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))`,
            }}
          >
            <div className="flex items-center justify-center border-e bg-muted/40 text-[10px] text-muted-foreground">
              القاهرة
            </div>
            {days.map((day) => (
              <div
                key={day}
                className={cn(
                  "border-e px-2 py-4 text-center last:border-e-0",
                  day === calendarReferenceDate && "bg-secondary/60",
                )}
              >
                <p className="text-xs font-bold">
                  {calendarDateLabel(day, { weekday: "long" })}
                </p>
                <span
                  className={cn(
                    "mx-auto mt-1 flex size-9 items-center justify-center rounded-full text-sm font-bold",
                    day === calendarReferenceDate
                      ? "bg-primary text-white"
                      : "text-muted-foreground",
                  )}
                >
                  {calendarDateLabel(day, { day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
          <div
            className="grid"
            style={{
              gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))`,
            }}
          >
            <div className="relative border-e bg-muted/30" style={{ height }}>
              {hours.map((hour, index) => (
                <span
                  key={hour}
                  className="absolute inset-x-0 pt-1 text-center text-[11px] text-muted-foreground"
                  style={{ top: index * 72 }}
                >
                  {calendarTime(hour * 60)}
                </span>
              ))}
            </div>
            {days.map((day) => (
              <div
                key={day}
                className={cn(
                  "relative border-e last:border-e-0",
                  day === calendarReferenceDate && "bg-secondary/20",
                )}
                style={{
                  height,
                  backgroundImage:
                    "repeating-linear-gradient(to bottom, transparent 0, transparent 71px, var(--color-border) 71px, var(--color-border) 72px)",
                }}
              >
                <div className="sr-only">
                  حصص{" "}
                  {calendarDateLabel(day, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </div>
                {calendarEventLanes(
                  visible.filter((lesson) => lesson.date === day),
                ).map(({ event, lane, lanes }) => {
                  const course = resolveCourse(event.courseId)!;
                  const subject = getSubject(course.subjectId)!;
                  return (
                    <button
                      type="button"
                      data-calendar-event={event.id}
                      key={event.id}
                      className={cn(
                        "absolute overflow-hidden rounded-lg border border-current/15 px-2 py-1.5 text-start shadow-none transition-shadow hover:shadow-none",
                        tones[subject.tone],
                        event.status === "cancelled" &&
                          "bg-muted text-muted-foreground",
                      )}
                      style={{
                        top:
                          ((calendarMinutes(event.time) - firstHour * 60) /
                            60) *
                            72 +
                          3,
                        height: Math.max(44, (event.duration / 60) * 72 - 6),
                        insetInlineStart: `calc(${(lane / lanes) * 100}% + 4px)`,
                        width: `calc(${100 / lanes}% - 8px)`,
                      }}
                      onClick={() => setSelectedId(event.id)}
                      aria-label={`${event.title}، ${calendarDateLabel(event.date, { weekday: "long", day: "numeric", month: "long" })}، ${calendarTime(calendarMinutes(event.time))}، ${event.duration} دقيقة، ${event.teacherName}${event.status === "cancelled" ? "، ملغاة" : ""}`}
                    >
                      <span className="block truncate text-xs font-semibold">
                        {event.status === "cancelled" && "ملغاة · "}
                        {event.title}
                      </span>
                      <span className="mt-0.5 block text-[10px]">
                        {calendarTime(calendarMinutes(event.time))} ·{" "}
                        {event.duration} د
                      </span>
                      {event.duration >= 60 && (
                        <span className="mt-1 block truncate text-[10px]">
                          {event.teacherName}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t p-4 text-[11px] text-muted-foreground">
        {calendarCourses.map((entry) => {
          const course = resolveCourse(entry.courseId)!;
          const subject = getSubject(course.subjectId)!;
          return (
            <span className="flex items-center gap-2" key={entry.courseId}>
              <span
                aria-hidden="true"
                className={cn(
                  "size-3 rounded border border-current/20",
                  tones[subject.tone],
                )}
              />
              {subject.name}
            </span>
          );
        })}
        <span className="ms-auto">
          المواعيد أمثلة؛ لا توجد حصة مباشرة أو دعوات فعلية.
        </span>
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-start">
            <DialogTitle>{selected?.title}</DialogTitle>
            <DialogDescription className="pt-2 leading-7">
              تفاصيل حصة تجريبية؛ لا يوجد رابط انضمام أو اجتماع حقيقي.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              <Badge className="w-fit">
                {resolveCourse(selected.courseId)?.title}
              </Badge>
              <dl className="space-y-4 rounded-xl border p-4 text-sm">
                <div>
                  <dt className="mb-1 text-xs text-muted-foreground">
                    التاريخ
                  </dt>
                  <dd>
                    {calendarDateLabel(selected.date, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 aria-hidden="true" className="size-3.5" />
                    الموعد — القاهرة
                  </dt>
                  <dd>
                    {calendarTime(calendarMinutes(selected.time))} —{" "}
                    {calendarTime(
                      calendarMinutes(selected.time) + selected.duration,
                    )}{" "}
                    · {selected.duration} دقيقة
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <GraduationCap aria-hidden="true" className="size-3.5" />
                    المدرس
                  </dt>
                  <dd className="flex items-center gap-2">
                    <TeacherAvatar teacherId={selected.teacherId} className="size-6" />
                    {selected.teacherName}
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Video aria-hidden="true" className="size-3.5" />
                    منصة الحصة
                  </dt>
                  <dd>{providerNames[selected.provider]} · معاينة فقط</dd>
                </div>
                {selected.source === "session-preview" && (
                  <div>
                    <dt className="mb-1 text-xs text-muted-foreground">
                      حالة الحصة والحضور
                    </dt>
                    <dd>
                      {selected.status === "cancelled"
                        ? `ملغاة: ${selected.cancellationReason}`
                        : learner
                          ? `مجدولة · ${attendanceLabels[attendance[selected.id]?.[studentId] ?? "unmarked"]}`
                          : "مجدولة"}
                    </dd>
                  </div>
                )}
                {selected.groupName && (
                  <div>
                    <dt className="mb-1 text-xs text-muted-foreground">
                      المجموعة
                    </dt>
                    <dd>{selected.groupName}</dd>
                  </div>
                )}
                {selected.description && (
                  <div>
                    <dt className="mb-1 text-xs text-muted-foreground">
                      وصف الحصة
                    </dt>
                    <dd className="whitespace-pre-wrap break-words">
                      {selected.description}
                    </dd>
                  </div>
                )}
                {!learner && selected.studentIds && (
                  <div>
                    <dt className="mb-1 text-xs text-muted-foreground">
                      سجل الحضور
                    </dt>
                    <dd className="space-y-2">
                      {selected.studentIds.length
                        ? selected.studentIds.map((student) => (
                            <p key={student}>
                              {accounts.find(
                                (a) =>
                                  a.kind === "student" &&
                                  a.entityId === student,
                              )?.name ?? "طالب"}{" "}
                              ·{" "}
                              {
                                attendanceLabels[
                                  attendance[selected.id]?.[student] ??
                                    "unmarked"
                                ]
                              }
                            </p>
                          ))
                        : "لا يوجد طلاب في قائمة الحصة."}
                    </dd>
                  </div>
                )}
                {selected.meetingReference &&
                  selected.status !== "cancelled" && (
                    <div>
                      <dt className="mb-1 text-xs text-muted-foreground">
                        معرّف الاجتماع التجريبي
                      </dt>
                      <dd className="break-all font-mono text-xs">
                        <bdi>{selected.meetingReference}</bdi>
                      </dd>
                    </div>
                  )}
              </dl>
              <Button variant="outline" asChild>
                <Link
                  href={portalCourseHref(role, selected.courseId, studentId)}
                >
                  عرض المقرر
                </Link>
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
