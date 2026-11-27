import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { listEducationHierarchy } from "@/features/catalog/live-catalog";
import { stagePresentation } from "@/features/catalog/catalog-presentation";
import { Breadcrumbs, PageIntro, tones } from "@/components/shared";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = await params;
  const hierarchy = await listEducationHierarchy();
  return {
    title: (hierarchy.state === "ready" ? hierarchy.data.stages : []).find((s) => s.id === stageId)?.name ?? "مرحلة غير موجودة",
  };
}
export default async function StagePage({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = await params;
  const hierarchy = await listEducationHierarchy();
  if (hierarchy.state === "error") return <div className="container-shell py-8"><p role="alert" className="soft-card p-4">تعذّر تحميل المراحل حاليًا.</p></div>;
  const { stages, grades } = hierarchy.data;
  const stage = stages.find((s) => s.id === stageId);
  if (!stage) notFound();
  return (
    <div className="container-shell py-6 md:py-8">
      <Breadcrumbs
        items={[
          { label: "المراحل الدراسية", href: "/stages" },
          { label: stage.name },
        ]}
      />
      <PageIntro
        title={stage.name}
        description="حدد صفك الدراسي لتصل إلى المواد والمقررات المناسبة لك."
      />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {grades
          .filter((g) => g.stage_id === stage.id)
          .map((grade) => (
            <Link
              className="soft-card group flex items-center gap-3 p-4 hover:border-primary"
              href={`/grades/${encodeURIComponent(grade.id)}`}
              key={grade.id}
            >
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-xl",
                  tones[stagePresentation(stage).tone],
                )}
              >
                <GraduationCap aria-hidden="true" />
              </span>
              <h2 className="font-bold">{grade.name}</h2>
              <ArrowLeft
                aria-hidden="true"
                className="ms-auto size-4 text-primary"
              />
            </Link>
          ))}
      </div>
    </div>
  );
}
