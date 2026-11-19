"use client";
import { TeacherAvatar } from "@/components/teacher-avatar";

import Link from "next/link";
import { BookOpen, Check, LockKeyhole, Play } from "lucide-react";
import type { Course } from "./types";
import { getTeacher } from "./mock-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/shared";
import { DemoDialog } from "@/components/demo-dialog";

export function UnitList({ course }: { course: Course }) {
  return (
    <div className="space-y-4">
      {course.units.map((unit, i) => (
        <details
          key={unit.id}
          className="soft-card group overflow-hidden"
          open={i === 0}
        >
          <summary className="flex min-h-18 list-none items-center justify-between gap-3 p-4 hover:bg-muted">
            <span className="flex items-center gap-3">
              <BookOpen aria-hidden="true" className="size-5 text-primary" />
              <span className="text-sm font-bold">
                الوحدة {i + 1}: <bdi>{unit.title}</bdi>
              </span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {unit.lessons.length} دروس{" "}
              <span
                className="ms-2 inline-block group-open:rotate-180"
                aria-hidden="true"
              >
                ⌄
              </span>
            </span>
          </summary>
          <ul className="border-t">
            {unit.lessons.map((lesson) => (
              <li
                key={lesson.id}
                className="flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-b-0"
              >
                {lesson.preview ? (
                  <Play aria-hidden="true" className="size-4 text-primary" />
                ) : (
                  <LockKeyhole
                    aria-hidden="true"
                    className="size-4 text-muted-foreground"
                  />
                )}
                <Link
                  className="flex min-h-11 flex-1 items-center text-sm font-semibold hover:text-primary"
                  href={`/lessons/${lesson.id}`}
                >
                  {lesson.title}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {lesson.minutes} دقيقة
                </span>
                {lesson.preview ? (
                  <Badge>معاينة مجانية</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    محتوى مقيد · نموذج
                  </span>
                )}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
export function CourseContent({ course }: { course: Course }) {
  const teacher = getTeacher(course.teacherId)!;
  return (
    <Tabs defaultValue="overview" dir="rtl">
      <TabsList className="mb-4 grid h-auto w-full grid-cols-3 rounded-xl bg-muted p-1">
        <TabsTrigger value="overview" className="min-h-11">
          عن المقرر
        </TabsTrigger>
        <TabsTrigger value="content" className="min-h-11">
          المحتوى
        </TabsTrigger>
        <TabsTrigger value="teacher" className="min-h-11">
          المدرس
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="space-y-4">
        <section className="soft-card p-4">
          <h2 className="mb-3 text-xl font-semibold">
            مشوار الفهم، خطوة بخطوة
          </h2>
          <p className="leading-7 text-muted-foreground">
            {course.description}
          </p>
          <h3 className="mb-3 mt-5 font-bold">هتلاقي إيه في المقرر؟</h3>
          <ul className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              "شرح مبسط لكل فكرة",
              "أمثلة محلولة بالتدريج",
              "وحدات منظمة للمراجعة",
              "معاينة لأول درس",
            ].map((text) => (
              <li key={text} className="flex gap-2">
                <Check
                  aria-hidden="true"
                  className="mt-1 size-4 shrink-0 text-primary"
                />
                {text}
              </li>
            ))}
          </ul>
        </section>
        <UnitList course={course} />
      </TabsContent>
      <TabsContent value="content">
        <h2 className="sr-only">وحدات ودروس المقرر</h2>
        <UnitList course={course} />
      </TabsContent>
      <TabsContent value="teacher">
        <section className="soft-card p-4">
          <div className="flex items-center gap-3">
            <TeacherAvatar teacherId={teacher.id} />
            <h2 className="text-xl font-semibold">أ. {teacher.name}</h2>
          </div>
          <p className="mt-3 leading-7 text-muted-foreground">{teacher.bio}</p>
          <Link
            className="mt-4 inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4"
            href={`/teachers/${teacher.id}`}
          >
            تعرّف على المدرس ومقرراته
          </Link>
          <p className="mt-4 text-xs text-muted-foreground">
            شخصية افتراضية للعرض.
          </p>
        </section>
      </TabsContent>
    </Tabs>
  );
}
export function CourseEnrollPreview({ price }: { price: number }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">سعر توضيحي للفصل الدراسي</p>
      <p className="text-3xl font-semibold">
        {price}{" "}
        <span className="text-sm font-semibold text-muted-foreground">ج.م</span>
      </p>
      <DemoDialog label="استكشف الاشتراك التجريبي" className="w-full" />
      <p className="text-xs leading-6 text-muted-foreground">
        لا يمكن شراء هذا المقرر. الأسعار افتراضية وغير معتمدة تجاريًا.
      </p>
    </div>
  );
}
