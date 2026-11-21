import Link from "next/link";
import { Breadcrumbs, PageIntro } from "@/components/shared";
import { listPublishedCourses } from "@/features/catalog/live-catalog";

export const metadata = { title: "المقررات" };

export default async function CoursesPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [query, courses] = await Promise.all([searchParams, listPublishedCourses()]);
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
    <form className="mb-5 flex max-w-lg flex-wrap items-end gap-2">
      {grade && <input type="hidden" name="grade" value={grade} />}
      {subject && <input type="hidden" name="subject" value={subject} />}
      {track && <input type="hidden" name="track" value={track} />}
      <label className="grid min-w-0 flex-1 gap-2 text-sm font-semibold">ابحث عن مقرر
        <input className="field" name="q" defaultValue={q} maxLength={100} type="search" />
      </label>
      <button className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-primary-foreground">بحث</button>
    </form>
    {visible.length ? <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((course) => <li key={course.id}>
        <Link href={`/courses/${course.id}`} className="soft-card block h-full p-5 hover:border-primary">
          <h2 className="text-lg font-bold">{course.title}</h2>
          {course.description && <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted-foreground">{course.description}</p>}
        </Link>
      </li>)}
    </ul> : <p className="soft-card p-5 text-muted-foreground">{courses.length ? "مفيش مقررات تطابق البحث." : "لا توجد مقررات منشورة حاليًا."}</p>}
  </div>;
}
