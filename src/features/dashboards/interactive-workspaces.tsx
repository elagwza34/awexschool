"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import Link from "next/link";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import { parentSections, type ParentSection } from "./parent-navigation";
import { HeartHandshake } from "lucide-react";
import { Badge, EmptyState } from "@/components/shared";
import { ParentChildPicker } from "./parent-child-picker";
import { DashboardCalendar } from "./dashboard-calendar";
import {
  MetricCards,
  Panel,
  ProgressBar,
  WeeklyChart,
} from "./dashboard-panels";
import { children } from "./mock-data";

const ParentSelectionContext = createContext<{
  childId: string;
  setChildId: (id: string) => void;
} | null>(null);
export function useParentSelection() {
  const selection = useContext(ParentSelectionContext);
  if (!selection)
    throw new Error("Parent selection requires ParentSelectionProvider");
  return selection;
}
export function ParentSelectionProvider({
  children: content,
}: {
  children: ReactNode;
}) {
  const [childId, setChildId] = useState(children[0].id);
  return (
    <ParentSelectionContext.Provider value={{ childId, setChildId }}>
      {content}
    </ParentSelectionContext.Provider>
  );
}

export function ParentWorkspace({
  section = "overview",
}: {
  section?: ParentSection;
}) {
  const selection = useContext(ParentSelectionContext);
  if (!selection)
    throw new Error("ParentWorkspace requires ParentSelectionProvider");
  const { childId, setChildId } = selection;
  const { getParentChildren } = useEnrollmentPreview();
  const linkedChildren = getParentChildren();
  const child =
    linkedChildren.find((c) => c.id === childId) ?? linkedChildren[0];
  if (!child)
    return (
      <EmptyState
        title="لا يوجد أبناء مرتبطون بولي الأمر"
        description="الإدارة تحدد الربط في المعاينة."
        href="/parent"
        action="لوحة ولي الأمر"
      />
    );
  const minutes = child.activity.reduce((total, day) => total + day.minutes, 0);
  const totalLessons = child.courses.reduce((total, c) => total + c.total, 0);
  return (
    <div className="space-y-4">
      <ParentChildPicker
        wards={linkedChildren}
        selectedId={child.id}
        onSelect={setChildId}
      />
      <div key={child.id} className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="bg-[#e5eef8] text-[#325e89]">
            متابعة {child.name}
          </Badge>
          <span className="text-xs text-muted-foreground">{child.grade}</span>
        </div>
        {section === "overview" && (
          <MetricCards
            metrics={[
              {
                label: "المقررات",
                value: `${child.courses.length}`,
                note: "ضمن البيانات التجريبية",
                icon: "courses",
                tone: "mint",
              },
              {
                label: "الدروس المكتملة",
                value: `${child.completed}`,
                note: `من أصل ${totalLessons} درسًا`,
                icon: "complete",
                tone: "blue",
              },
              {
                label: "وقت التعلّم",
                value: `${minutes} دقيقة`,
                note: "في الأسبوع التوضيحي",
                icon: "time",
                tone: "peach",
              },
              {
                label: "نسبة التقدّم",
                value: `${Math.round((totalLessons ? child.completed / totalLessons : 0) * 100)}٪`,
                note: "مؤشر افتراضي، وليس تقييمًا",
                icon: "review",
                tone: "lilac",
              },
            ]}
          />
        )}
        {section === "overview" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {parentSections
              .filter((item) => item.id !== "overview")
              .map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="soft-card flex min-h-16 items-center p-4 text-sm font-bold hover:border-primary"
                >
                  {item.label}
                </Link>
              ))}
          </div>
        )}
        <div className="space-y-4">
          <div className="space-y-4">
            {section === "progress" && (
              <WeeklyChart
                data={child.activity}
                title={`وقت تعلّم ${child.name}`}
              />
            )}
          </div>
          <div className="space-y-4">
            {section === "overview" && (
              <Panel
                title="وجودك بيفرق"
                subtitle="اقتراح تشجيعي، وليس توصية مبنية على تحليل"
              >
                <HeartHandshake
                  aria-hidden="true"
                  className="mb-4 size-8 text-primary"
                />
                <p className="text-sm leading-7 text-muted-foreground">
                  اسأل عن فكرة جديدة اتعلمها النهارده، واسمع إجابته بطريقته.
                  الاهتمام بالرحلة أهم من مقارنة النتائج.
                </p>
                <p className="mb-2 mt-4 text-xs font-bold">
                  الهدف الأسبوعي التوضيحي
                </p>
                <ProgressBar
                  value={(minutes / child.goal) * 100}
                  label={`الهدف الأسبوعي لـ${child.name}`}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {minutes} من {child.goal} دقيقة
                </p>
              </Panel>
            )}
            {section === "schedule" && (
              <DashboardCalendar
                role="parent"
                key={child.id}
                studentId={child.id}
                id="schedule"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
