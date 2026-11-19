import { courses } from "@/features/catalog/mock-data";
import type { ContentRecord } from "./types";
export const contentFixtures: ContentRecord[] = courses.map((course) => {
  const working = {
    id: course.id,
    title: course.title,
    description: course.description,
    gradeId: course.gradeId,
    track: course.track ?? "arabic",
    subjectId: course.subjectId,
    teacherId: course.teacherId,
    term: course.term,
    units: course.units.map((unit) => ({
      id: unit.id,
      title: unit.title,
      lessons: unit.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        minutes: lesson.minutes,
        body:
          lesson.previewSteps
            ?.map((step) => `${step.title}\n${step.text}\n${step.example}`)
            .join("\n\n") || lesson.summary,
        objectives: lesson.objectives,
        resources: [],
      })),
    })),
  };
  return {
    working,
    published: structuredClone(working),
    revision: 1,
    publishedRevision: 1,
    status: "published",
    reviewNote: "",
  };
});
