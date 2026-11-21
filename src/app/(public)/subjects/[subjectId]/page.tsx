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
  const teachers = getTeachersForSubject(subject.id);
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
      {teachers.length > 0 && (
        <section className="mb-7">
          <SectionHeading title="مدرسو المادة" />
          <div
            role="region"
            aria-label="بطاقات مدرسو المادة"
            tabIndex={teachers.length > 1 ? 0 : undefined}
            className="flex min-w-0 snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain px-1 py-1 [scrollbar-width:thin] md:flex-wrap md:overflow-visible"
          >
            {teachers.map((teacher) => (
              <div key={teacher.id} className="w-[min(15rem,85%)] shrink-0 snap-start md:w-60">
                <TeacherCard teacher={teacher} variant="compact" />
              </div>
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
