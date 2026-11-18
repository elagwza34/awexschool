"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { EmptyState, tones } from "@/components/shared";
import { cn } from "@/lib/utils";
import { LearningCards, Panel } from "./dashboard-panels";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import { StudentGroupsSummary } from "@/features/enrollments/workspace";
import { useParentSelection } from "./interactive-workspaces";

export function ParentChildCourses({ childId }: { childId?: string }) {
  const { setChildId } = useParentSelection();
  const { getParentChildren } = useEnrollmentPreview();
  const children = getParentChildren();
  const child = children.find((item) => item.id === childId);
  const linkedChildId = child?.id;
  useEffect(() => {
    if (linkedChildId) setChildId(linkedChildId);
  }, [linkedChildId, setChildId]);

  if (childId && !child)
    return (
      <EmptyState
        title="الابن غير مرتبط بولي الأمر"
        href="/parent/courses"
        action="كل الأبناء"
      />
    );
  if (child)
    return (
      <div className="space-y-4">
        <Link
          href="/parent/courses"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary"
        >
          <ArrowRight aria-hidden="true" className="size-4" />
          كل الأبناء
        </Link>
        <Panel
          id="courses"
          title={`خطوات ${child.name} في المقررات`}
          subtitle={child.grade}
        >
          <LearningCards entries={child.courses} parentView studentId={child.id} />
        </Panel>
        <StudentGroupsSummary studentId={child.id} />
      </div>
    );

  if (!children.length)
    return (
      <EmptyState
        title="لا يوجد أبناء مرتبطون بولي الأمر"
        href="/parent"
        action="لوحة ولي الأمر"
      />
    );
  return (
    <section
      aria-label="الأبناء"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      {children.map((item) => (
        <Link
          key={item.id}
          href={`/parent/courses/${item.id}`}
          className="soft-card group flex min-h-28 items-center gap-3 p-4 transition-colors hover:border-primary"
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold",
              tones[item.id === "youssef" ? "mint" : "peach"],
            )}
          >
            {item.initials}
          </span>
          <div className="min-w-0 space-y-2">
            <h2 className="text-lg font-semibold">{item.name}</h2>
            <p className="text-sm text-muted-foreground">{item.grade}</p>
            <span className="inline-flex items-center gap-2 text-sm font-bold text-primary">
              عرض المقررات
              <ArrowLeft aria-hidden="true" className="size-4" />
            </span>
          </div>
        </Link>
      ))}
    </section>
  );
}
