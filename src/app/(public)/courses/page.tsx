import { Suspense } from "react";
import { Breadcrumbs, PageIntro } from "@/components/shared";
import LoadingState from "@/components/loading-state";
import { PublishedCourseCard } from "@/components/published-course-card";
import { listCatalogOptions, listPublishedCourses } from "@/features/catalog/live-catalog";

export const metadata = { title: "المقررات" };

type CoursesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function CoursesPage(props: CoursesPageProps) {
  return <Suspense fallback={<LoadingState />}><CoursesContent {...props} /></Suspense>;
}

async function CoursesContent({ searchParams }: CoursesPageProps) {
  const [query, coursesResult, optionsResult] = await Promise.all([searchParams, listPublishedCourses(), listCatalogOptions()]);
  const options = optionsResult.state === "ready" ? optionsResult.data : { grades: [], subjects: [] };
  const courses = coursesResult.state === "ready" ? coursesResult.data : [];
  const unconfiguredPreview = coursesResult.state === "error" && coursesResult.kind === "configuration";
  const [q, grade, subject, track] = ["q", "grade", "subject", "track"].map((key) => {
    const value = query[key];
    return typeof value === "string" ? value : undefined;
  });
  const needle = (q ?? "").trim().toLocaleLowerCase("ar");
  const visible = courses.filter((course) => (!grade || course.grade_id === grade) &&
    (!subject || course.subject_id === subject) && (!track || course.track === track) &&
    (!needle || course.title.toLocaleLowerCase("ar").includes(needle)));
  return <div className="container-shell py-8">
    <Breadcrumbs items={[{ label: "المقررات" }]} />
    <PageIntro title="المقررات الدراسية" description="تصفّح المقررات المنشورة وسجّل طلب التحاقك." />
    {(coursesResult.state === "error" && coursesResult.kind !== "configuration" ||
      optionsResult.state === "error" && optionsResult.kind !== "configuration") &&
      <p role="alert" className="soft-card mb-5 p-5 text-destructive">تعذّر تحميل بيانات المقررات حاليًا.</p>}
    <form className="soft-card mb-5 grid items-end gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
      <label className="grid min-w-0 gap-2 text-sm font-semibold">ابحث عن مقرر
        <input className="field" name="q" defaultValue={q} maxLength={100} type="search" />
      </label>
      <label className="grid min-w-0 gap-2 text-sm font-semibold">الصف
        <select className="field" name="grade" defaultValue={grade ?? ""}>
          <option value="">كل الصفوف</option>
          {options.grades.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="grid min-w-0 gap-2 text-sm font-semibold">المادة
        <select className="field" name="subject" defaultValue={subject ?? ""}>
          <option value="">كل المواد</option>
          {options.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="grid min-w-0 gap-2 text-sm font-semibold">المسار
        <select className="field" name="track" defaultValue={track ?? ""}>
          <option value="">كل المسارات</option>
          <option value="arabic">عربي</option>
          <option value="languages">لغات</option>
        </select>
      </label>
      <button className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-primary-foreground">بحث</button>
    </form>
    {visible.length ? <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((course) => <li key={course.id}>
        <PublishedCourseCard course={course} grade={options.grades.find((item) => item.id === course.grade_id)?.name} />
      </li>)}
    </ul> : (coursesResult.state === "ready" || unconfiguredPreview) && <p className="soft-card p-5 text-muted-foreground">{courses.length ? "مفيش مقررات تطابق البحث." : "لا توجد مقررات منشورة حاليًا."}</p>}
  </div>;
}
