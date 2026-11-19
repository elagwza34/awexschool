import type { Metadata } from "next";
import { Breadcrumbs, PageIntro } from "@/components/shared";
import { StageCard } from "@/components/catalog-cards";
import { stages } from "@/features/catalog/mock-data";

export const metadata: Metadata = { title: "المراحل الدراسية" };

const stageImages = {
  kindergarten: "/school-home/img/kg-800.webp",
  primary: "/school-home/img/desk-800.webp",
  preparatory: "/school-home/img/kids-720.webp",
  secondary: "/school-home/img/teen-800.webp",
};

export default function StagesPage() {
  return (
    <div className="container-shell py-6 md:py-8">
      <Breadcrumbs items={[{ label: "المراحل الدراسية" }]} />
      <PageIntro
        eyebrow="كل مرحلة لها حكايتها"
        title="اختار مرحلتك، وابدأ رحلتك"
        description="استكشف السنوات الدراسية من الحضانة لحد الثانوية العامة."
      />
      <div className="mb-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stages.map((stage) => (
          <StageCard key={stage.id} stage={stage} image={stageImages[stage.id]} />
        ))}
      </div>
    </div>
  );
}
