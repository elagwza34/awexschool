"use client";
import { Badge } from "@/components/shared";
import { getGrade, getSubject } from "@/features/catalog/mock-data";
import { courseTrackLabels } from "@/features/catalog/types";
import type { ContentCourse } from "./types";
const resourceNames = { pdf: "ملف PDF", video: "فيديو", link: "رابط" };
export function CourseContentPreview({
  course,
  expandedLessonId,
}: {
  course: ContentCourse;
  expandedLessonId?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge>{getGrade(course.gradeId)?.name}</Badge>
        <Badge>المسار: {courseTrackLabels[course.track ?? "arabic"]}</Badge>
        <Badge>{getSubject(course.subjectId)?.name}</Badge>
        <Badge>{course.term}</Badge>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm leading-7">
        {course.description}
      </p>
      {!course.units.length && (
        <p className="text-sm">لا توجد وحدات في هذه المسودة.</p>
      )}
      {course.units.map((unit, index) => (
        <section key={unit.id} className="space-y-3 rounded-lg border p-3">
          <h3 className="font-bold">
            {index + 1}. {unit.title}
          </h3>
          {!unit.lessons.length && (
            <p className="text-sm text-muted-foreground">
              لا توجد دروس في هذه الوحدة.
            </p>
          )}
          {unit.lessons.map((lesson) => (
            <details
              key={lesson.id}
              className="rounded-md border p-3"
              open={lesson.id === expandedLessonId}
            >
              <summary className="min-h-11 cursor-pointer text-sm font-semibold leading-7">
                {lesson.title} · {lesson.minutes} دقيقة
              </summary>
              <div className="space-y-3 pt-3">
                <ul className="list-inside list-disc space-y-1 text-sm">
                  {lesson.objectives.map((objective, i) => (
                    <li className="break-words" key={i}>
                      {objective}
                    </li>
                  ))}
                </ul>
                <p className="whitespace-pre-wrap break-words text-sm leading-7">
                  {lesson.body || "نص الدرس لم يُكتب بعد."}
                </p>
                {lesson.resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="rounded-md bg-secondary/40 p-3 text-sm"
                  >
                    <p className="font-semibold">
                      {resource.title} · {resourceNames[resource.kind]}
                    </p>
                    <p className="mt-2 break-all text-muted-foreground">
                      <bdi>{resource.reference}</bdi>
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      معاينة مورد فقط؛ لا يوجد تحميل أو تشغيل فيديو أو فتح رابط
                      فعلي.
                    </p>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </section>
      ))}
    </div>
  );
}
