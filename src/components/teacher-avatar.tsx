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
  portraitPath,
  fallback,
  className,
}: {
  teacherId?: string;
  portraitPath?: string | null;
  fallback?: ReactNode;
  className?: string;
}) {
  const src = portraitPath && /^\/teachers\/[a-z0-9-]+\.webp$/.test(portraitPath)
    ? portraitPath : teacherId && portraitIds.has(teacherId) ? `/teachers/${teacherId}.webp` : null;
  if (!src && !fallback) return null;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-bold",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          unoptimized
          className="object-cover"
        />
      ) : fallback}
    </span>
  );
}
