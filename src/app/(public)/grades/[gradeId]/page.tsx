import { notFound } from "next/navigation";
import {
  grades,
  stages,
  subjects,
  courses,
} from "@/features/catalog/mock-data";
import {
  Breadcrumbs,
  EmptyState,
  PageIntro,
  SectionHeading,
} from "@/components/shared";
import { CourseCard, SubjectCard } from "@/components/catalog-cards";

export const dynamicParams = false;
export function generateStaticParams() {
  return grades.map((g) => ({ gradeId: g.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ gradeId: string }>;
}) {
  const { gradeId } = await params;
  return {
    title: grades.find((g) => g.id === gradeId)?.name ?? "صف غير موجود",
  };
}
export default async function GradePage({
  params,
}: {
  params: Promise<{ gradeId: string }>;
}) {
  const { gradeId } = await params;
  const grade = grades.find((g) => g.id === gradeId);
  if (!grade) notFound();
  const stage = stages.find((s) => s.id === grade.stageId)!;
  const available = courses.filter((c) => c.gradeId === gradeId);
  const offeredSubjects = subjects.filter((s) =>
    available.some((c) => c.subjectId === s.id),
  );
  return (
    <div className="container-shell py-6 md:py-8">
      <Breadcrumbs
        items={[
          { label: "المراحل", href: "/stages" },
          { label: stage.name, href: `/stages/${stage.id}` },
          { label: grade.name },
        ]}
      />
      <PageIntro
        eyebrow="سنة جديدة، أفكار جديدة"
        title={grade.name}
        description="اختار مادتك، واستكشف المقررات والدروس المتاحة في العرض التجريبي."
      />
      {available.length ? (
        <>
          <div className="mb-8 grid gap-3 md:grid-cols-3">
            {offeredSubjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                href={`/subjects/${subject.id}?grade=${grade.id}`}
              />
            ))}
          </div>
          <SectionHeading title="مقررات صفك الدراسي" />
          <div className="mb-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {available.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          title="لسه بنجهّز مساحة هذا الصف"
          description="لا تتوفر بيانات نموذجية لهذا الصف حاليًا. يمكنك استكشاف المقررات الأخرى للتعرّف على التجربة."
        />
      )}
    </div>
  );
}
