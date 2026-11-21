import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stages.map((stage) => (
          <StageCard key={stage.id} stage={stage} image={stageImages[stage.id]} />
        ))}
      </div>
      <Link
        href="/courses?track=languages"
        className="soft-card mb-14 grid overflow-hidden transition-colors hover:border-primary md:grid-cols-[minmax(0,22rem)_1fr]"
      >
        <div className="relative aspect-[2/1] bg-muted md:aspect-auto md:min-h-44">
          <Image
            src="/school-home/img/langs-599.webp"
            alt=""
            fill
            sizes="(min-width: 768px) 352px, 92vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col justify-center gap-3 p-5 sm:p-6">
          <h2 className="text-xl font-bold">كورسات اللغات</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            كورسات مكثفة لتعليم اللغات: الإنجليزية والألمانية، جنب الدراسة أو لوحدها.
          </p>
          <span className="flex items-center gap-2 text-sm font-bold text-primary">
            تصفّح الكورسات المتاحة
            <ArrowLeft aria-hidden="true" className="size-4" />
          </span>
        </div>
      </Link>
    </div>
  );
}
