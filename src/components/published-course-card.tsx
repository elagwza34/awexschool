import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PublishedCourseCard({ course, grade, actions, headingLevel = 2 }: {
  course: { id: string; title: string; description: string | null; track: string };
  grade?: string;
  actions?: ReactNode;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <div className={cn("soft-card flex h-full flex-col", !actions && "hover:border-primary")}>
      <Link href={`/courses/${course.id}`} className="flex-1 rounded-xl p-5 focus-visible:outline-2 focus-visible:outline-offset-2">
        <Heading className="text-lg font-bold">{course.title}</Heading>
        <p className="mt-1 text-sm font-semibold text-primary">
          {[grade, course.track === "languages" ? "لغات" : "عربي"].filter(Boolean).join(" · ")}
        </p>
        {course.description && <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted-foreground">{course.description}</p>}
      </Link>
      {actions && <div className="border-t px-5 py-3">{actions}</div>}
    </div>
  );
}
