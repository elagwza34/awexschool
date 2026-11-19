import type { Metadata } from "next";
import { Breadcrumbs, DemoNotice, PageIntro } from "@/components/shared";
import { TeacherCard } from "@/components/catalog-cards";
import { teachers } from "@/features/catalog/mock-data";

export const metadata: Metadata = { title: "مدرسونا" };
export default function TeachersPage() {
  return (
    <div className="container-shell py-6 md:py-8">
      <Breadcrumbs items={[{ label: "مدرسونا" }]} />
      <PageIntro
        eyebrow="الفهم يبدأ بمدرس قريب منك"
        title="ناس بتحب تشرح.. وتسمع سؤالك"
        description="تعرّف على نماذج ملفات المدرسين ومقرراتهم. صور البروفايل افتراضية."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {teachers.map((teacher) => (
          <TeacherCard
            teacher={teacher}
            key={teacher.id}
            compact
          />
        ))}
      </div>
      <DemoNotice />
    </div>
  );
}
