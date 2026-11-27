import type { Metadata } from "next";
import { Breadcrumbs, PageIntro } from "@/components/shared";
import { filterPublishedCatalog } from "@/features/catalog/catalog-data";
import { listCatalogOptions, listPublishedCourses } from "@/features/catalog/live-catalog";
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
  const [params, courses, options] = await Promise.all([searchParams, listPublishedCourses(), listCatalogOptions()]);
  const filters = parseCatalogQuery(params);
  const { q, grade, subject, track } = filters;
  const unavailable = courses.state === "error" || options.state === "error";
  return (
    <div className="container-shell py-6 md:py-8">
      <Breadcrumbs items={[{ label: "البحث" }]} />
      <PageIntro
        title="سؤالك أول الطريق"
        description="ابحث باسم المادة أو المقرر أو المدرس."
      />
      <CatalogBrowser
        search
        results={courses.state === "ready" ? filterPublishedCatalog(courses.data, filters) : []}
        grades={options.state === "ready" ? options.data.grades : []}
        subjects={options.state === "ready" ? options.data.subjects : []}
        unavailable={unavailable}
        fixedTrack={track}
        key={JSON.stringify(filters)}
        initialQuery={q}
        initialGrade={grade}
        initialSubject={subject}
      />
    </div>
  );
}
