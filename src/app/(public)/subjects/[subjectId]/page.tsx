import { notFound } from "next/navigation";
import { subjects, getTeachersForSubject } from "@/features/catalog/mock-data";
import { Breadcrumbs, PageIntro, SectionHeading } from "@/components/shared";
import { TeacherCard } from "@/components/catalog-cards";
import { CatalogBrowser } from "@/features/catalog/catalog-browser";
import {
  parseCatalogQuery,
  type CatalogSearchParams,
} from "@/features/catalog/query";

export const dynamicParams = false;
export function generateStaticParams() {
  return subjects.map((subject) => ({ subjectId: subject.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = await params;
  return {
    title: subjects.find((s) => s.id === subjectId)?.name ?? "مادة غير موجودة",
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
  const subject = subjects.find((s) => s.id === subjectId);
  if (!subject) notFound();
  const { grade, q, track } = parseCatalogQuery(await searchParams);
  return (
    <div className="container-shell py-6 md:py-8">
      <Breadcrumbs
        items={[
          { label: "المواد", href: "/subjects" },
          { label: subject.name },
        ]}
      />
      <PageIntro title={subject.name} description={subject.description} />
      {getTeachersForSubject(subject.id).length > 0 && (
        <section className="mb-7">
          <SectionHeading
            title="مدرسو المادة"
            description="المادة ممكن يدرّسها أكثر من مدرس، وكل مدرس مرتبط بمادة واحدة."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {getTeachersForSubject(subject.id).map((teacher) => (
              <TeacherCard key={teacher.id} teacher={teacher} />
            ))}
          </div>
        </section>
      )}
      <CatalogBrowser
        key={`${grade}-${q}-${track}`}
        fixedSubject={subject.id}
        fixedTrack={track}
        initialGrade={grade}
        initialQuery={q}
      />
    </div>
  );
}
