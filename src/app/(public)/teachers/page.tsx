import Link from "next/link";
import { sessionClient } from "@/features/auth/supabase-server";
import { PageIntro } from "@/components/shared";
import { LiveTeacherPhoto } from "@/components/live-teacher-photo";

export const metadata = { title: "المدرسين" };

export default async function TeachersPage() {
  const client = await sessionClient();
  const response = await client?.from("teacher_profiles").select("user_id,full_name,qualification,bio,portrait_path").order("full_name");
  return <div className="container-shell py-8">
    <PageIntro title="المدرسين" />
    <Link href="/teachers/apply" className="mb-4 inline-flex min-h-11 items-center font-bold text-primary underline">انضم كمدرس</Link>
    {response?.data?.length ? <div className="grid gap-4 md:grid-cols-3">
      {response.data.map((teacher) => <article key={teacher.user_id} className="soft-card p-5">
        <div className="flex items-center gap-4">
          <LiveTeacherPhoto name={teacher.full_name} path={teacher.portrait_path} />
          <div>
            <h2 className="font-bold"><Link href={`/teachers/${teacher.user_id}`} className="underline underline-offset-4">{teacher.full_name}</Link></h2>
            <p className="mt-2 text-sm text-muted-foreground">{teacher.qualification}</p>
          </div>
        </div>
        <p className="mt-2 whitespace-pre-line text-sm leading-7">{teacher.bio}</p>
      </article>)}
    </div> : response?.error || !response
      ? <p role="alert" className="soft-card p-5">تعذّر تحميل قائمة المدرسين حاليًا.</p>
      : <p className="soft-card p-5">لا يوجد مدرسون متاحون حاليًا.</p>}
  </div>;
}
