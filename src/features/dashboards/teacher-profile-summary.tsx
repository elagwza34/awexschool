"use client";

import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { getSubject } from "@/features/catalog/mock-data";
import { Badge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Panel } from "./dashboard-panels";
import { curriculumOptions } from "./management-fixtures";
import { DashboardCalendar } from "./dashboard-calendar";
import { usePortalPreview } from "./preview-context";

export function TeacherProfileSummary() {
  const { teacherProfile } = usePortalPreview();
  return (
    <Panel
      title="بروفايلك المهني"
      subtitle="ملف المدرس وتخصصه ونطاق المنهج"
      action={
        <Button asChild variant="outline">
          <Link href="/teacher/profile">
            تعديل البروفايل
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
      }
    >
      <div className="flex items-start gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
          <GraduationCap aria-hidden="true" className="size-7" />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold">{teacherProfile.displayName}</h2>
          <p className="my-2 text-xs leading-7 text-muted-foreground">
            {teacherProfile.specialtyDetail}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge>{getSubject(teacherProfile.specialization)?.name}</Badge>
            <Badge className="bg-muted text-muted-foreground">
              {
                curriculumOptions.find(
                  (c) => c.id === teacherProfile.curriculumId,
                )?.name
              }
            </Badge>
            <Badge className="bg-muted text-muted-foreground">
              {teacherProfile.gradeIds.length} صفوف في المعاينة
            </Badge>
          </div>
        </div>
      </div>
    </Panel>
  );
}
export function TeacherSchedulePreview() {
  return <DashboardCalendar role="teacher" id="schedule" />;
}
