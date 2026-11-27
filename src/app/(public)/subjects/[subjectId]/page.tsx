import { notFound } from "next/navigation";
import { listEducationHierarchy, listPublicTeacherCards, listPublishedCourses, teacherPresentation } from "@/features/catalog/live-catalog";
import { subjectPresentation } from "@/features/catalog/catalog-presentation";
import { filterPublishedCatalog } from "@/features/catalog/catalog-data";
import { LiveCatalogCourseCard } from "@/features/catalog/live-catalog-card";
import { Breadcrumbs, PageIntro, SectionHeading } from "@/components/shared";
import { TeacherCard } from "@/components/catalog-cards";
import { CatalogBrowser } from "@/features/catalog/catalog-browser";
import {
  parseCatalogQuery,
  type CatalogSearchParams,
} from "@/features/catalog/query";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = await params;
  const hierarchy = await listEducationHierarchy();
  return {
    title: (hierarchy.state === "ready" ? hierarchy.data.subjects : []).find((s) => s.id === subjectId)?.name ?? "مادة غير موجودة",
  };
}
export default async function SubjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectId: string }>;
  searchParams: Promise<CatalogSearchParams>;
}) {
  const { subjectId } = await params;
  const [hierarchy, catalog, directory] = await Promise.all([listEducationHierarchy(), listPublishedCourses(), listPublicTeacherCards()]);
  if (hierarchy.state === "error") return <div className="container-shell py-8"><p role="alert" className="soft-card p-4">تعذّر تحميل المواد حاليًا.</p></div>;
  const { grades, subjects } = hierarchy.data;
  const subject = subjects.find((s) => s.id === subjectId);
  if (!subject) notFound();
  const { grade, q, track } = parseCatalogQuery(await searchParams);
  const teachers = directory.state === "ready" ? directory.data.filter(({ subject_id }) => subject_id === subject.id).map(teacherPresentation) : [];
  const results = catalog.state === "ready" ? filterPublishedCatalog(catalog.data, { q, grade, track, subject: subject.id }) : [];
  return (
    <div className="container-shell py-6 md:py-8">
      <Breadcrumbs
        items={[
          { label: "المواد", href: "/subjects" },
          { label: subject.name },
        ]}
      />
      <PageIntro title={subject.name} description={subjectPresentation(subject).description} />
      {directory.state === "error" && <p role="alert" className="soft-card mb-5 p-4">تعذّر تحميل مدرسِي المادة حاليًا.</p>}
      {teachers.length > 0 && (
        <section className="mb-7">
          <SectionHeading
            title="مدرسو المادة"
            description="المادة ممكن يدرّسها أكثر من مدرس، وكل مدرس مرتبط بمادة واحدة."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teachers.map((teacher) => (
              <TeacherCard key={teacher.id} teacher={teacher} />
            ))}
          </div>
        </section>
      )}
      <CatalogBrowser
        key={`${grade}-${q}-${track}`}
        resultCount={results.length}
        grades={grades}
        subjects={subjects}
        unavailable={catalog.state === "error"}
        fixedSubject={subject.id}
        fixedTrack={track}
        initialGrade={grade}
        initialQuery={q}
      >
        {results.map((course) => <LiveCatalogCourseCard key={course.id} course={course} />)}
      </CatalogBrowser>
    </div>
  );
}
