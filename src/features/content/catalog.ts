import { courses } from "@/features/catalog/mock-data";
import type { Course } from "@/features/catalog/types";
import type { ContentCourse } from "./types";
// Portal contracts deliberately leave pricing unset for new editorial courses.
export type PortalCourse = Omit<Course, "price"> & { price?: number };
export function toPortalCourse(content: ContentCourse): PortalCourse {
  const fixture = courses.find((c) => c.id === content.id);
  return {
    ...content,
    ...(fixture ? { price: fixture.price } : {}),
    units: content.units.map((unit) => ({
      id: unit.id,
      title: unit.title,
      lessons: unit.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        minutes: lesson.minutes,
        preview: true,
        summary: lesson.body,
        objectives: lesson.objectives,
      })),
    })),
  };
}
