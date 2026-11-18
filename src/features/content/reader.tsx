"use client";
import Link from "next/link";
import { EmptyState, Badge } from "@/components/shared";
import { Panel } from "@/features/dashboards/dashboard-panels";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import { useContent } from "./context";
import { CourseContentPreview } from "./preview";
import { portalCourseHref, type CourseReaderRole } from "./routes";
export function PortalCourseReader({
  role,
  courseId,
  studentId,
  lessonId,
}: {
  role: CourseReaderRole;
  courseId: string;
  studentId?: string;
  lessonId?: string;
}) {
  const registry = useEnrollmentPreview();
  const { records } = useContent();
  const learnerId = role === "student" ? "youssef" : studentId;
  const child =
    role === "parent"
      ? registry.getParentChildren().find((c) => c.id === studentId)
      : undefined;
  const allowed =
    role === "admin" ||
    (role === "teacher"
      ? registry
          .getTeacherCourses("ahmed-hassan")
          .some((c) => c.id === courseId)
      : (role !== "parent" || !!child) &&
        !!learnerId &&
        registry
          .getStudentCourses(learnerId)
          .some((c) => c.courseId === courseId));
  const back =
    role === "parent"
      ? child
        ? `/parent/courses/${child.id}`
        : "/parent/courses"
      : `/${role}/${role === "admin" ? "content" : "courses"}`;
  const course = records.find((r) => r.working.id === courseId)?.published;
  if (!allowed || !course)
    return (
      <EmptyState
        title="المحتوى غير متاح"
        description="المقرر غير منشور حاليًا أو غير مرتبط بك أو بالابن المختار في المعاينة."
        href={back}
        action="العودة للمقررات"
      />
    );
  const lesson = course.units
    .flatMap((u) => u.lessons)
    .find((l) => l.id === lessonId);
  if (lessonId && !lesson)
    return (
      <EmptyState
        title="الدرس غير متاح في النسخة المعتمدة"
        href={portalCourseHref(role, courseId, studentId)}
        action="عرض المقرر"
      />
    );
  const reading = lesson
    ? {
        ...course,
        units: course.units
          .filter((u) => u.lessons.some((l) => l.id === lesson.id))
          .map((u) => ({ ...u, lessons: [lesson] })),
      }
    : course;
  return (
    <div className="space-y-4">
      <nav aria-label="مسار المحتوى" className="flex flex-wrap gap-3 text-sm">
        <Link
          className="inline-flex min-h-11 items-center text-primary"
          href={back}
        >
          العودة للمقررات
        </Link>
        {lesson && (
          <Link
            className="inline-flex min-h-11 items-center text-primary"
            href={portalCourseHref(role, courseId, studentId)}
          >
            {course.title}
          </Link>
        )}
      </nav>
      <Badge>النسخة المعتمدة · معاينة بدون حفظ دائم</Badge>
      <h1 className="text-2xl font-bold sm:text-3xl">
        {lesson?.title ?? course.title}
      </h1>
      {child && (
        <p className="text-sm text-muted-foreground">مقررات {child.name}</p>
      )}
      <Panel
        title={lesson ? "محتوى الدرس" : "محتوى المقرر"}
        subtitle="المحتوى المعتمد نفسه في المقررات والمكتبة. لا توجد اجتماعات أو تنزيلات أو تسجيل تقدّم فعلي هنا."
      >
        <CourseContentPreview
          key={`${course.id}:${lessonId ?? "course"}`}
          course={reading}
          expandedLessonId={lesson?.id}
        />
      </Panel>
      <Panel title="دروس المقرر" subtitle="الترتيب حسب آخر نسخة معتمدة.">
        <div className="space-y-3">
          {course.units.map((unit) => (
            <section key={unit.id} className="rounded-lg border p-3">
              <h3 className="font-bold">{unit.title}</h3>
              <ul className="mt-2 divide-y">
                {unit.lessons.map((item) => (
                  <li key={item.id}>
                    <Link
                      aria-current={item.id === lessonId ? "page" : undefined}
                      className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm text-primary"
                      href={portalCourseHref(
                        role,
                        courseId,
                        studentId,
                        item.id,
                      )}
                    >
                      <span>{item.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {item.minutes} دقيقة
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Panel>
    </div>
  );
}
