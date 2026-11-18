import type { Metadata } from "next";
import { Breadcrumbs, PageIntro } from "@/components/shared";
import { CatalogBrowser } from "@/features/catalog/catalog-browser";
import {
  parseCatalogQuery,
  type CatalogSearchParams,
} from "@/features/catalog/query";

export const metadata: Metadata = { title: "المقررات التعليمية" };
export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const { q, grade, subject } = parseCatalogQuery(await searchParams);
  return (
    <div className="container-shell py-6 md:py-8">
      <Breadcrumbs items={[{ label: "المقررات التعليمية" }]} />
      <PageIntro
        eyebrow="الفهم يبدأ من هنا"
        title="مقرر يناسبك، وخطوة تقرّبك"
        description="تصفّح المقررات النموذجية، واختر المادة والصف لتصل إلى ما تبحث عنه."
      />
      <CatalogBrowser
        key={`${q}-${grade}-${subject}`}
        initialQuery={q}
        initialGrade={grade}
        initialSubject={subject}
      />
    </div>
  );
}
