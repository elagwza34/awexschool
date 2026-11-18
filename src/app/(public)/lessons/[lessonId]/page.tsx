import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, Clock3, LockKeyhole } from "lucide-react";
import { courses, getLesson } from "@/features/catalog/mock-data";
import { Badge, Breadcrumbs, DemoNotice } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { DemoDialog } from "@/components/demo-dialog";
import { LessonPreview } from "@/features/lessons/lesson-preview";

export const dynamicParams = false;
export function generateStaticParams() {
  return courses.flatMap((c) =>
    c.units.flatMap((u) => u.lessons.map((l) => ({ lessonId: l.id }))),
  );
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  return {
    title: getLesson((await params).lessonId)?.lesson.title ?? "درس غير موجود",
  };
}
export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const data = getLesson((await params).lessonId);
  if (!data) notFound();
  const { course, unit, lesson } = data;
  return (
    <div className="container-shell py-6 md:py-8">
      <Breadcrumbs
        items={[
          { label: "المقررات", href: "/courses" },
          { label: course.title, href: `/courses/${course.id}` },
          { label: "الدروس", href: `/courses/${course.id}/lessons` },
          { label: lesson.title },
        ]}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge>
          {lesson.preview ? "معاينة مجانية" : "محتوى مقيد · نموذج واجهة"}
        </Badge>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock3 aria-hidden="true" className="size-4" />
          {lesson.minutes} دقيقة · مدة توضيحية
        </span>
      </div>
      <h1 className="mb-6 text-2xl font-bold md:text-3xl">{lesson.title}</h1>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
        <div>
          {lesson.preview ? (
            <LessonPreview
              title={lesson.title}
              steps={lesson.previewSteps ?? []}
            />
          ) : (
            <section className="soft-card p-6 text-center">
              <LockKeyhole
                aria-hidden="true"
                className="mx-auto mb-4 size-12 text-primary"
              />
              <h2 className="text-xl font-bold">
                هذا الدرس خارج المعاينة المجانية
              </h2>
              <p className="my-4 text-muted-foreground">
                هذا عرض لحالة المحتوى المقيد فقط، وليس نظام حماية أو اشتراك
                فعليًا.
              </p>
              <DemoDialog label="تعرّف على الوصول التجريبي" />
              <Button asChild variant="outline" className="mx-2 mt-3">
                <Link href={`/lessons/${course.units[0].lessons[0].id}`}>
                  اذهب للمعاينة المجانية
                </Link>
              </Button>
            </section>
          )}
          <section className="soft-card mt-4 p-4">
            <h2 className="text-lg font-semibold">عن الدرس</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {lesson.summary}
            </p>
            <h3 className="mb-3 mt-4 font-bold">أهداف التعلّم</h3>
            <ul className="space-y-3 text-sm">
              {lesson.objectives.map((objective) => (
                <li key={objective} className="flex gap-2">
                  <Check
                    aria-hidden="true"
                    className="mt-1 size-4 shrink-0 text-primary"
                  />
                  {objective}
                </li>
              ))}
            </ul>
          </section>
        </div>
        <aside className="soft-card overflow-hidden">
          <h2 className="border-b bg-secondary/40 p-4 font-bold">
            في هذه الوحدة
          </h2>
          <p className="px-4 pt-4 text-xs text-muted-foreground">
            {unit.title}
          </p>
          <ol className="p-3">
            {unit.lessons.map((item, i) => (
              <li key={item.id}>
                <Link
                  aria-current={item.id === lesson.id ? "page" : undefined}
                  className={`flex min-h-16 items-center gap-3 rounded-xl p-3 text-sm ${item.id === lesson.id ? "bg-secondary font-bold text-primary" : "hover:bg-muted"}`}
                  href={`/lessons/${item.id}`}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-white text-xs">
                    {i + 1}
                  </span>
                  {item.title}
                </Link>
              </li>
            ))}
          </ol>
          <Link
            className="m-3 flex min-h-11 items-center justify-center rounded-lg border text-sm font-bold text-primary"
            href={`/courses/${course.id}/lessons`}
          >
            كل وحدات المقرر
          </Link>
        </aside>
      </div>
      <DemoNotice className="mt-6" />
    </div>
  );
}
