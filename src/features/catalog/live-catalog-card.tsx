import { CatalogCourseCard } from "@/components/catalog-cards";
import { catalogCardDetails } from "./catalog-data";
import type { listPublishedCourses } from "./live-catalog";

type Course = Extract<Awaited<ReturnType<typeof listPublishedCourses>>, { state: "ready" }>["data"][number];

export function LiveCatalogCourseCard({ course }: { course: Course }) {
  const { gradeName, subjectName, teacher } = catalogCardDetails(course);
  return <CatalogCourseCard
    id={course.id}
    title={course.title}
    subjectId={course.subject_id}
    subjectName={subjectName}
    gradeName={gradeName}
    teacher={teacher ? {
      id: teacher.user_id,
      name: teacher.full_name,
      initials: teacher.full_name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join(" "),
      portraitPath: teacher.portrait_path,
    } : undefined}
  />;
}
