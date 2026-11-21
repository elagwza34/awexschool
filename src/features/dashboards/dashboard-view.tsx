"use client";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/shared";
import { ParentWorkspace } from "./interactive-workspaces";
import { AdminOverviewLinks } from "./admin-overview-links";

import { getDashboardProfile } from "./mock-data";
import { parentSections, type ParentSection } from "./parent-navigation";
import { ParentChildCourses } from "./parent-child-courses";

export function DashboardView({
  role,
  section = "overview",
  childId,
}: {
  role: "admin" | "parent";
  section?: ParentSection;
  childId?: string;
}) {
  const profile = getDashboardProfile(role);
  return (
    <div className="space-y-4">
      <div id="overview" className="scroll-mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Badge className="bg-white text-muted-foreground">
            {profile.subtitle}
          </Badge>
          <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <CalendarDays aria-hidden="true" className="size-3.5" />
            أسبوع جديد، خطوة جديدة
          </span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold leading-relaxed sm:text-3xl">
              {role === "parent" && section !== "overview"
                ? parentSections.find((item) => item.id === section)!.label
                : profile.greeting}
            </h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {role === "parent" && section === "courses"
                ? childId
                  ? "مقررات الابن المختار وتقدّمه في كل مقرر."
                  : "اختار أحد الأبناء لعرض مقرراته."
                : profile.description}
            </p>
          </div>
        </div>
      </div>
      {role === "parent" ? (
        section === "courses" ? (
          <ParentChildCourses childId={childId} />
        ) : (
          <ParentWorkspace section={section} />
        )
      ) : (
        <>
          {role === "admin" && (
            <>
              <AdminOverviewLinks />
            </>
          )}
        </>
      )}
    </div>
  );
}
