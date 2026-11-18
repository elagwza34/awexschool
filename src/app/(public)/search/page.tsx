import type { Metadata } from "next";
import { Breadcrumbs, PageIntro } from "@/components/shared";
import { CatalogBrowser } from "@/features/catalog/catalog-browser";
import {
  parseCatalogQuery,
  type CatalogSearchParams,
} from "@/features/catalog/query";

export const metadata: Metadata = { title: "البحث" };
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const { q, grade, subject } = parseCatalogQuery(await searchParams);
  return (
    <div className="container-shell py-6 md:py-8">
      <Breadcrumbs items={[{ label: "البحث" }]} />
      <PageIntro
        title="سؤالك أول الطريق"
        description="ابحث باسم المادة أو المقرر أو المدرس. النتائج من بيانات العرض التجريبي فقط."
      />
      <CatalogBrowser
        search
        key={`${q}-${grade}-${subject}`}
        initialQuery={q}
        initialGrade={grade}
        initialSubject={subject}
      />
    </div>
  );
}
