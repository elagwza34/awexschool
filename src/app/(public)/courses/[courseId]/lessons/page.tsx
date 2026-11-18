import { notFound } from "next/navigation";
import { courses, getCourse } from "@/features/catalog/mock-data";
import { Breadcrumbs, PageIntro } from "@/components/shared";
import { UnitList } from "@/features/catalog/course-content";

export const dynamicParams = false;
export function generateStaticParams() {
  return courses.map((c) => ({ courseId: c.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  return {
    title: `وحدات ودروس ${getCourse((await params).courseId)?.title ?? "المقرر"}`,
  };
}
export default async function UnitsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const course = getCourse((await params).courseId);
  if (!course) notFound();
  return (
    <div className="container-shell max-w-4xl py-6 md:py-8">
      <Breadcrumbs
        items={[
          { label: "المقررات", href: "/courses" },
          { label: course.title, href: `/courses/${course.id}` },
          { label: "الوحدات والدروس" },
        ]}
      />
      <PageIntro
        title="خريطة المقرر"
        description={`${course.title} · ${course.units.length} وحدات · دروس منظمة خطوة بخطوة. الدرس الأول متاح كمعاينة نصية تفاعلية.`}
      />
      <UnitList course={course} />
    </div>
  );
}
