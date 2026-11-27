import type { Metadata } from "next";
import { Breadcrumbs, PageIntro } from "@/components/shared";
import { SubjectCard } from "@/components/catalog-cards";
import { listEducationHierarchy } from "@/features/catalog/live-catalog";
import { subjectPresentation } from "@/features/catalog/catalog-presentation";

export const metadata: Metadata = { title: "المواد التعليمية" };
export default async function SubjectsPage() {
  const hierarchy = await listEducationHierarchy();
  const subjects = hierarchy.state === "ready" ? hierarchy.data.subjects : [];
  return (
    <div className="container-shell py-6 md:py-8">
      <Breadcrumbs items={[{ label: "المواد التعليمية" }]} />
      <PageIntro
        eyebrow="مساحة لكل فضول"
        title="كل مادة، باب لعالم جديد"
        description="اكتشف المواد والمقررات المتاحة. اختر المادة، ثم حدد صفك الدراسي."
      />
      {hierarchy.state === "error" && <p role="alert" className="soft-card mb-5 p-4">تعذّر تحميل البيانات حاليًا.</p>}
      <div className="mb-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => (
          <SubjectCard subject={subjectPresentation(subject)} key={subject.id} />
        ))}
      </div>
    </div>
  );
}
