import type { Metadata } from "next";
import { TeacherApplicationForm } from "@/features/teachers/application-form";

export const metadata: Metadata = { title: "انضم إلينا كمدرس" };

export default function TeacherApplicationPage() {
  return (
    <div className="container-shell max-w-4xl py-8 sm:py-12">
      <h1 className="text-2xl font-bold sm:text-3xl">انضم إلينا كمدرس</h1>
      <p className="mt-3 mb-6 text-sm leading-7 text-muted-foreground">
        عرّفنا بتخصصك وخبرتك وطريقة شرحك. استخدم بيانات تجريبية. الطلب والفيديو محفوظان مؤقتًا أثناء التنقل في المعاينة.
      </p>
      <section className="soft-card p-4 sm:p-6"><TeacherApplicationForm /></section>
    </div>
  );
}
