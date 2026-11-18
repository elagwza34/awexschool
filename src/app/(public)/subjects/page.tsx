import type { Metadata } from "next";
import { Breadcrumbs, PageIntro } from "@/components/shared";
import { SubjectCard } from "@/components/catalog-cards";
import { subjects } from "@/features/catalog/mock-data";

export const metadata: Metadata = { title: "المواد التعليمية" };
export default function SubjectsPage() {
  return (
    <div className="container-shell py-6 md:py-8">
      <Breadcrumbs items={[{ label: "المواد التعليمية" }]} />
      <PageIntro
        eyebrow="مساحة لكل فضول"
        title="كل مادة، باب لعالم جديد"
        description="اكتشف المواد والمقررات المتاحة. اختر المادة، ثم حدد صفك الدراسي."
      />
      <div className="mb-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => (
          <SubjectCard subject={subject} key={subject.id} />
        ))}
      </div>
    </div>
  );
}
