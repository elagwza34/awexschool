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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tracks = [
  { id: "arabic", label: "عربي" },
  { id: "languages", label: "لغات" },
] as const;

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
      <Tabs key={grade.id} dir="rtl" defaultValue="arabic" className="gap-5">
        <TabsList aria-label="مسار الدراسة" className="w-full justify-start sm:w-fit">
          {tracks.map(({ id, label }) => (
            <TabsTrigger value={id} key={id} className="min-w-24 px-5">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tracks.map(({ id, label }) => {
          const trackCourses = available.filter((course) => (course.track ?? "arabic") === id);
          const offeredSubjects = subjects.filter((subject) =>
            trackCourses.some((course) => course.subjectId === subject.id),
          );
          return (
            <TabsContent value={id} key={id}>
              {trackCourses.length ? (
                <>
                  <div className="mb-8 grid gap-3 md:grid-cols-3">
                    {offeredSubjects.map((subject) => (
                      <SubjectCard
                        key={subject.id}
                        subject={subject}
                        href={`/subjects/${subject.id}?grade=${grade.id}&track=${id}`}
                      />
                    ))}
                  </div>
                  <SectionHeading title="مقررات صفك الدراسي" />
                  <div className="mb-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {trackCourses.map((course) => (
                      <CourseCard key={course.id} course={course} />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState
                  title={`مقررات مسار ${label} غير متاحة لهذا الصف حاليًا`}
                  description="تقدر تستكشف المسار التاني أو تختار صف دراسي تاني."
                />
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
