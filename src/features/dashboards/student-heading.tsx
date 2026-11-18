"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { getGrade } from "@/features/catalog/mock-data";
import { usePortalPreview } from "./preview-context";

export function StudentHeading({
  title,
  description,
  overview = false,
}: {
  title: string;
  description: string;
  overview?: boolean;
}) {
  const { studentProfile } = usePortalPreview();
  const firstName = studentProfile.displayName.trim().split(/\s+/)[0];
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <Badge className="mb-3 bg-white text-muted-foreground">
          {getGrade(studentProfile.gradeId)?.name}
        </Badge>
        <h1 className="text-2xl font-bold leading-relaxed sm:text-3xl">
          {overview ? `أهلًا يا ${firstName}، جاهز لفكرة جديدة؟` : title}
        </h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          {description}
        </p>
      </div>
      {overview && (
        <Button asChild variant="outline">
          <Link href="/courses">
            اكتشف مقررًا جديدًا
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
      )}
    </div>
  );
}
