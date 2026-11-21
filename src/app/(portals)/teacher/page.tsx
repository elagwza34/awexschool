import Link from "next/link";
import { redirect } from "next/navigation";
import { LiveTeacherPhoto } from "@/components/live-teacher-photo";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";

export default async function TeacherDashboard() {
  const account = await getAccount();
  const client = ownerClient();
  if (!account?.roles.includes("teacher") || !client) redirect("/account");

  const [{ data: profile }, { data: courses }] = await Promise.all([
    client.from("teacher_profiles").select("full_name,qualification,portrait_path")
      .eq("user_id", account.user.id).maybeSingle(),
    client.from("courses").select("id,title,description").eq("teacher_id", account.user.id)
      .eq("status", "published").order("title"),
  ]);
  const name = profile?.full_name ?? account.name;

  return <main id="main-content" className="container-shell space-y-6 pt-28 pb-10">
    <div className="soft-card flex items-center gap-4 p-5">
      <LiveTeacherPhoto name={name} path={profile?.portrait_path ?? null} />
      <div>
        <h1 className="text-2xl font-bold">{name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{profile?.qualification}</p>
        <Link href="/account" className="mt-1 inline-flex min-h-11 items-center text-sm text-primary underline">حسابي</Link>
      </div>
    </div>
    <section className="space-y-3" aria-labelledby="teacher-courses">
      <h2 id="teacher-courses" className="text-xl font-bold">مقرراتي</h2>
      {courses?.length ? <ul className="grid gap-3 sm:grid-cols-2">{courses.map((course) => (
        <li key={course.id} className="soft-card p-4">
          <Link href={`/courses/${course.id}`} className="inline-flex min-h-11 items-center font-semibold text-primary underline">{course.title}</Link>
          <p className="text-sm leading-7 text-muted-foreground">{course.description}</p>
        </li>
      ))}</ul> : <p className="text-muted-foreground">مفيش مقررات مسندة لحسابك حاليًا.</p>}
    </section>
  </main>;
}
