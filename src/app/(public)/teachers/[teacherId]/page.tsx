import { notFound } from "next/navigation";
import { BookOpen, GraduationCap } from "lucide-react";
import { teachers, courses, getTeacher } from "@/features/catalog/mock-data";
import {
  Badge,
  Breadcrumbs,
  DemoNotice,
  EmptyState,
  SectionHeading,
  tones,
} from "@/components/shared";
import { CourseCard } from "@/components/catalog-cards";
import { cn } from "@/lib/utils";

export const dynamicParams = false;
export function generateStaticParams() {
  return teachers.map((t) => ({ teacherId: t.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ teacherId: string }>;
}) {
  return {
    title: getTeacher((await params).teacherId)?.name ?? "مدرس غير موجود",
  };
}
export default async function TeacherPage({
  params,
}: {
  params: Promise<{ teacherId: string }>;
}) {
  const teacher = getTeacher((await params).teacherId);
  if (!teacher) notFound();
  const available = courses.filter((c) => c.teacherId === teacher.id);
  return (
    <div className="container-shell py-6 md:py-8">
      <Breadcrumbs
        items={[
          { label: "مدرسونا", href: "/teachers" },
          { label: `أ. ${teacher.name}` },
        ]}
      />
      <section className="soft-card mb-8 overflow-hidden">
        <div className={cn("h-22 border-b", tones[teacher.tone])} />
        <div className="grid gap-5 p-4 sm:grid-cols-[140px_1fr] sm:p-6">
          <div>
            <span
              aria-hidden="true"
              className={cn(
                "-mt-10 flex size-32 items-center justify-center rounded-md border-8 border-white text-3xl font-bold",
                tones[teacher.tone],
              )}
            >
              {teacher.initials}
            </span>
            <Badge className="mt-4">ملف افتراضي للعرض</Badge>
          </div>
          <div>
            <p className="mb-2 text-sm font-bold text-primary">
              {teacher.title}
            </p>
            <h1 className="text-3xl font-bold">أ. {teacher.name}</h1>
            <p className="my-4 max-w-2xl leading-7 text-muted-foreground">
              {teacher.bio}
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-2">
                <GraduationCap
                  aria-hidden="true"
                  className="size-5 text-primary"
                />
                {teacher.experience} سنوات خبرة · توضيحي
              </span>
              <span className="flex items-center gap-2">
                <BookOpen aria-hidden="true" className="size-5 text-primary" />
                {available.length} مقررات نموذجية
              </span>
            </div>
          </div>
        </div>
      </section>
      <SectionHeading title="نفهم مع بعض في المقررات دي" />
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {available.map((course) => (
          <CourseCard course={course} key={course.id} />
        ))}
      </div>
      {!available.length && (
        <div className="mb-6">
          <EmptyState
            title="لا توجد مقررات لهذا المدرس في المعاينة حاليًا"
            description="المدرس مرتبط بمادته، ولم تُضف له مقررات نموذجية بعد."
            href={`/subjects/${teacher.subjectId}`}
            action="عرض المادة ومدرسيها"
          />
        </div>
      )}
      <DemoNotice />
    </div>
  );
}
