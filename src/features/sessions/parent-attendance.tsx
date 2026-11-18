"use client";
import { EmptyState } from "@/components/shared";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import { useParentSelection } from "@/features/dashboards/interactive-workspaces";
import { ParentChildPicker } from "@/features/dashboards/parent-child-picker";
import { SessionRecords } from "./views";
export function ParentAttendance() {
  const { getParentChildren } = useEnrollmentPreview();
  const { childId, setChildId } = useParentSelection();
  const children = getParentChildren(),
    child = children.find((item) => item.id === childId) ?? children[0];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">الحضور والغياب</h1>
      <p className="text-sm text-muted-foreground">
        متابعة حضور كل ابن وغيابه ومواعيد حصصه في المعاينة.
      </p>
      {child ? (
        <>
          <ParentChildPicker
            wards={children}
            selectedId={child.id}
            onSelect={setChildId}
          />
          <SessionRecords key={child.id} role="parent" studentId={child.id} />
        </>
      ) : (
        <EmptyState
          title="لا يوجد أبناء مرتبطون بولي الأمر"
          href="/parent"
          action="لوحة ولي الأمر"
        />
      )}
    </div>
  );
}
