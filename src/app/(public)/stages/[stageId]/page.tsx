import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { stages, grades } from "@/features/catalog/mock-data";
import { Breadcrumbs, PageIntro, tones } from "@/components/shared";
import { cn } from "@/lib/utils";

export const dynamicParams = false;
export function generateStaticParams() {
  return stages.map((s) => ({ stageId: s.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = await params;
  return {
    title: stages.find((s) => s.id === stageId)?.name ?? "مرحلة غير موجودة",
  };
}
export default async function StagePage({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = await params;
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
        description="حدد صفك الدراسي لتصل إلى المواد والمقررات المناسبة لك. تتوفر مقررات نموذجية لبعض الصفوف في هذا العرض."
      />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {grades
          .filter((g) => g.stageId === stage.id)
          .map((grade) => (
            <Link
              className="soft-card group flex items-center gap-3 p-4 hover:border-primary"
              href={`/grades/${grade.id}`}
              key={grade.id}
            >
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-xl",
                  tones[stage.tone],
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
