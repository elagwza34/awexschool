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
  const { q, grade, subject, track } = parseCatalogQuery(await searchParams);
  const isLanguages = track === "languages";
  return (
    <div className="container-shell py-6 md:py-8">
      <Breadcrumbs items={isLanguages
        ? [{ label: "المقررات التعليمية", href: "/courses" }, { label: "كورسات اللغات" }]
        : [{ label: "المقررات التعليمية" }]} />
      <PageIntro
        eyebrow="الفهم يبدأ من هنا"
        title={isLanguages ? "كورسات اللغات" : "مقرر يناسبك، وخطوة تقرّبك"}
        description={isLanguages
          ? "تصفّح كورسات الإنجليزية المتاحة حاليًا، واختار الصف الدراسي المناسب لك."
          : "تصفّح المقررات النموذجية، واختر المادة والصف لتصل إلى ما تبحث عنه."}
      />
      <CatalogBrowser
        key={`${q}-${grade}-${subject}-${track}`}
        initialQuery={q}
        initialGrade={grade}
        initialSubject={subject}
        fixedTrack={track}
      />
    </div>
  );
}
