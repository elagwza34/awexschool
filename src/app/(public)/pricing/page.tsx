import type { Metadata } from "next";
import { Breadcrumbs, DemoNotice, PageIntro } from "@/components/shared";
import { DemoDialog } from "@/components/demo-dialog";
import { pricingPreviews } from "@/features/catalog/public-info-data";

export const metadata: Metadata = { title: "نماذج الباقات التوضيحية" };
export default function PricingPage() {
  return (
    <div className="container-shell py-6">
      <Breadcrumbs items={[{ label: "الباقات التوضيحية" }]} />
      <PageIntro
        title="نماذج الباقات"
        description="تصوّرات للعرض فقط. الأسعار والشروط التجارية لم تعتمد، ولا توجد اشتراكات أو مدفوعات فعلية."
      />
      <DemoNotice className="mb-4" />
      <div className="grid gap-4 md:grid-cols-3">
        {pricingPreviews.map((plan) => (
          <article key={plan.id} className="soft-card flex flex-col p-4">
            <h2 className="text-xl font-semibold">{plan.title}</h2>
            <p className="my-3 text-sm leading-7 text-muted-foreground">
              {plan.description}
            </p>
            <p className="mb-4 font-semibold text-primary">
              السعر يُحدد لاحقًا
            </p>
            <ul className="mb-4 list-inside list-disc space-y-2 text-sm leading-7">
              {plan.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
            <DemoDialog
              className="mt-auto"
              label="عرض تفاصيل النموذج"
              title={plan.title}
              description={`${plan.description} هذا نموذج بصري فقط؛ لا يتم شراء باقة أو تفعيل اشتراك. الأسعار والمزايا النهائية تحتاج اعتمادًا منفصلًا.`}
            />
          </article>
        ))}
      </div>
    </div>
  );
}
