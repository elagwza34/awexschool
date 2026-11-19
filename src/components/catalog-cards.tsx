import { TeacherAvatar } from "@/components/teacher-avatar";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  GraduationCap,
  Puzzle,
  Shapes,
  Sprout,
} from "lucide-react";
import { Badge, tones } from "@/components/shared";
import { getGrade, getSubject, getTeacher, grades } from "@/features/catalog/mock-data";
import type { Course, Stage, Subject, Teacher } from "@/features/catalog/types";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

const stageIcons = {
  kindergarten: Puzzle,
  primary: Sprout,
  preparatory: Shapes,
  secondary: GraduationCap,
};

export function StageCard({ stage, image }: { stage: Stage; image?: string }) {
  const Icon = stageIcons[stage.id];
  const yearCount = grades.filter((grade) => grade.stageId === stage.id).length;
  return (
    <Link
      href={routes.stage(stage.id)}
      className="soft-card group relative flex flex-col p-4 transition-colors hover:border-primary"
    >
      {image && (
        <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-xl bg-muted">
          <Image
            src={image}
            alt=""
            fill
            sizes="(min-width: 1240px) 260px, (min-width: 1024px) 25vw, (min-width: 640px) 48vw, 92vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "mb-4 flex size-12 items-center justify-center rounded-2xl",
            tones[stage.tone],
          )}
        >
          <Icon aria-hidden="true" className="size-7" />
        </span>
        <span className="text-xs font-semibold text-muted-foreground">
          {yearCount === 2 ? "سنتان" : `${yearCount.toLocaleString("ar-EG")} صفوف`}
        </span>
      </div>
      <h3 className="text-xl font-semibold">{stage.name}</h3>
      <p className="mb-4 mt-2 text-sm text-muted-foreground">
        {stage.description}
      </p>
      <span className="mt-auto flex items-center justify-between border-t pt-4 text-sm font-bold text-primary">
        اختر صفك الدراسي
        <ArrowLeft aria-hidden="true" className="size-4" />
      </span>
    </Link>
  );
}
export function SubjectCard({
  subject,
  href,
}: {
  subject: Subject;
  href?: string;
}) {
  return (
    <Link
      href={href ?? routes.subject(subject.id)}
      className="soft-card group flex items-center gap-3 p-4 transition-colors hover:border-primary"
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-xl text-2xl font-bold",
          tones[subject.tone],
        )}
      >
        {subject.symbol}
      </span>
      <div className="min-w-0">
        <h3 className="font-bold">{subject.name}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {subject.description}
        </p>
      </div>
      <ArrowLeft
        aria-hidden="true"
        className="ms-auto size-4 shrink-0 text-primary"
      />
    </Link>
  );
}
export function CourseCard({ course }: { course: Course }) {
  const subject = getSubject(course.subjectId)!;
  const teacher = getTeacher(course.teacherId)!;
  const total = course.units.reduce((n, unit) => n + unit.lessons.length, 0);
  return (
    <article className="soft-card overflow-hidden transition-colors hover:border-primary">
      <Link
        href={routes.course(course.id)}
        tabIndex={-1}
        aria-hidden="true"
        className={cn(
          "relative flex h-28 items-center justify-center overflow-hidden border-b",
          tones[subject.tone],
        )}
      >
        <span className="absolute start-4 top-4 rounded-md bg-white/80 px-2 py-1 text-[11px] font-bold">
          {course.term}
        </span>
        <span className="absolute -bottom-10 -end-7 size-40 rounded-full border-[24px] border-current opacity-[.06]" />
        <span className="absolute bottom-4 start-5 text-[11px] font-bold">
          liveschool / مساحة للفهم
        </span>
        <span className="font-serif text-5xl" dir="ltr">
          {subject.id === "math" ? "x² + y²" : subject.symbol}
        </span>
      </Link>
      <div className="p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge>{subject.name}</Badge>
          <Badge className="bg-muted text-muted-foreground">
            {getGrade(course.gradeId)?.name}
          </Badge>
        </div>
        <h3 className="text-lg font-semibold">
          <Link className="hover:text-primary" href={routes.course(course.id)}>
            {course.title}
          </Link>
        </h3>
        <Link
          href={routes.teacher(teacher.id)}
          className="mt-3 flex min-h-11 items-center gap-2 text-sm text-muted-foreground"
        >
            <TeacherAvatar teacherId={teacher.id} fallback={teacher.initials} className="size-8" />
          أ. {teacher.name}
        </Link>
        <div className="mt-4 flex flex-wrap gap-3 border-t pt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BookOpen aria-hidden="true" className="size-3.5" />
            {total} دروس
          </span>
          <span className="flex items-center gap-1.5">
            <Clock3 aria-hidden="true" className="size-3.5" />
            بإيقاعك
          </span>
          <span className="ms-auto font-bold text-primary">معاينة مجانية</span>
        </div>
      </div>
    </article>
  );
}
export function TeacherCard({
  teacher,
  variant = "default",
}: {
  teacher: Teacher;
  variant?: "default" | "compact" | "directory";
}) {
  if (variant !== "default") {
    const directory = variant === "directory";
    return (
      <Link
        href={routes.teacher(teacher.id)}
        className={cn(
          "soft-card flex h-full items-center transition-colors hover:border-primary focus-visible:outline-offset-0",
          directory ? "min-h-28 gap-4 p-3 sm:p-4" : "min-h-20 gap-3 px-3 py-2.5",
        )}
      >
        <TeacherAvatar
          teacherId={teacher.id}
          fallback={teacher.initials}
          className={directory ? "size-20 rounded-xl sm:size-24" : "size-11"}
        />
        <div className="min-w-0 flex-1">
          <h3 className={cn("font-bold leading-6", directory ? "text-base" : "text-sm")}>
            أ. {teacher.name}
          </h3>
          <p className={cn("leading-5 text-muted-foreground", directory ? "mt-1 text-sm" : "text-xs")}>
            {teacher.title}
          </p>
        </div>
        <ArrowLeft aria-hidden="true" className="size-4 shrink-0 text-primary" />
      </Link>
    );
  }

  return (
    <Link
      href={routes.teacher(teacher.id)}
      className="soft-card group flex h-full flex-col items-center p-6 text-center transition-all hover:-translate-y-1 hover:border-primary hover:shadow-md"
    >
      <TeacherAvatar teacherId={teacher.id} fallback={teacher.initials} className="mb-4 size-20 border-4 border-white text-2xl shadow-sm ring-1 ring-border" />
      <h3 className="text-lg font-semibold">أ. {teacher.name}</h3>
      <p className="mt-1 text-sm font-medium text-primary">{teacher.title}</p>
      <span className="mt-3 inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
        خبرة {teacher.experience} سنوات
      </span>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
        {teacher.bio}
      </p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">
        عرض الملف
        <ArrowLeft
          aria-hidden="true"
          className="size-4 transition-transform group-hover:-translate-x-1"
        />
      </span>
    </Link>
  );
}
