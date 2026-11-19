import { TeacherAvatar } from "@/components/teacher-avatar";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Check, Play } from "lucide-react";
import {
  courses,
  getCourse,
  getGrade,
  getSubject,
  getTeacher,
} from "@/features/catalog/mock-data";
import { Badge, Breadcrumbs, DemoNotice, tones } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  CourseContent,
  CourseEnrollPreview,
} from "@/features/catalog/course-content";
import { cn } from "@/lib/utils";

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
    title: getCourse((await params).courseId)?.title ?? "مقرر غير موجود",
  };
}
export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const course = getCourse((await params).courseId);
  if (!course) notFound();
  const subject = getSubject(course.subjectId)!;
  const teacher = getTeacher(course.teacherId)!;
  const grade = getGrade(course.gradeId)!;
  const preview = course.units[0].lessons[0];
  return (
    <div className="container-shell py-6 md:py-8">
      <Breadcrumbs
        items={[
          { label: "المقررات", href: "/courses" },
          { label: subject.name, href: `/subjects/${subject.id}` },
          { label: course.title },
        ]}
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge>{subject.name}</Badge>
            <Badge className="bg-muted text-muted-foreground">
              {grade.name}
            </Badge>
            <Badge className="bg-muted text-muted-foreground">
              {course.term}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold md:text-4xl">{course.title}</h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            {course.description}
          </p>
          <Link
            className="mb-6 mt-4 flex min-h-11 items-center gap-3 text-sm font-bold"
            href={`/teachers/${teacher.id}`}
          >
            <TeacherAvatar teacherId={teacher.id} fallback={teacher.initials} />
            مع أ. {teacher.name}
            <ArrowLeft aria-hidden="true" className="size-4" />
          </Link>
          <CourseContent course={course} />
        </div>
        <aside className="soft-card overflow-hidden lg:sticky lg:top-(--site-sticky-top)">
          <div
            className={cn(
              "relative flex h-48 items-center justify-center",
              tones[subject.tone],
            )}
          >
            <span dir="ltr" className="font-serif text-7xl">
              {subject.id === "math" ? "x² + y²" : subject.symbol}
            </span>
            <Badge className="absolute bottom-4 start-4 bg-white/90">
              معاينة من المقرر
            </Badge>
          </div>
          <div className="p-4">
            <Button asChild variant="outline" className="mb-4 w-full">
              <Link href={`/lessons/${preview.id}`}>
                <Play aria-hidden="true" />
                شاهد معاينة مجانية
              </Link>
            </Button>
            <CourseEnrollPreview price={course.price} />
            <ul className="my-4 space-y-3 border-t pt-4 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <BookOpen aria-hidden="true" className="size-4" />
                {course.units.length} وحدات ·{" "}
                {course.units.flatMap((u) => u.lessons).length} دروس
              </li>
              <li className="flex gap-2">
                <Check aria-hidden="true" className="size-4" />
                تعلم بالسرعة التي تناسبك
              </li>
            </ul>
            <Link
              className="inline-flex min-h-11 items-center text-sm font-bold text-primary underline underline-offset-4"
              href={`/courses/${course.id}/lessons`}
            >
              استعرض كل الوحدات والدروس
            </Link>
          </div>
        </aside>
      </div>
      <DemoNotice className="mt-6" />
    </div>
  );
}
