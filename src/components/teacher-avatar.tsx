import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const portraitIds = new Set([
  "ahmed-hassan",
  "khaled-ibrahim",
  "mahmoud-samir",
  "mariam-adel",
  "nour-ibrahim",
  "omar-salem",
]);

export function TeacherAvatar({
  teacherId,
  fallback,
  className,
}: {
  teacherId?: string;
  fallback?: ReactNode;
  className?: string;
}) {
  const hasPortrait = teacherId && portraitIds.has(teacherId);
  if (!hasPortrait && !fallback) return null;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-bold",
        className,
      )}
    >
      {hasPortrait ? (
        <Image
          src={`/teachers/${teacherId}.webp`}
          alt=""
          fill
          unoptimized
          className="object-cover"
        />
      ) : fallback}
    </span>
  );
}
