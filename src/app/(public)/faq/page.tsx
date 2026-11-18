import type { Metadata } from "next";
import { Breadcrumbs, PageIntro } from "@/components/shared";
import { publicFaqs } from "@/features/catalog/public-info-data";

export const metadata: Metadata = { title: "الأسئلة الشائعة" };
export default function FaqPage() {
  return (
    <div className="container-shell py-6">
      <Breadcrumbs items={[{ label: "الأسئلة الشائعة" }]} />
      <PageIntro
        title="الأسئلة الشائعة"
        description="إجابات عن استخدام liveschool وحدود المعاينة الحالية."
      />
      <div className="space-y-3">
        {publicFaqs.map((item) => (
          <details key={item.question} className="soft-card p-4">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
              {item.question}
            </summary>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
