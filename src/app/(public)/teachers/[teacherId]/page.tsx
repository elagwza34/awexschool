import { notFound } from "next/navigation";
import { ownerClient } from "@/features/auth/supabase-server";
import { Breadcrumbs } from "@/components/shared";
import { LiveTeacherPhoto } from "@/components/live-teacher-photo";

export default async function TeacherProfile({ params }: { params: Promise<{ teacherId: string }> }) {
  const { teacherId } = await params;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(teacherId)) notFound();
  const result = await ownerClient()?.from("teacher_profiles")
    .select("full_name,qualification,bio,experience_years,portrait_path").eq("user_id", teacherId).maybeSingle();
  if (!result?.data) notFound();
  const teacher = result.data;
  return <div className="container-shell py-8">
    <Breadcrumbs items={[{ label: "مدرسونا", href: "/teachers" }, { label: teacher.full_name }]} />
    <article className="soft-card grid gap-3 p-6">
      <div className="flex items-center gap-4">
        <LiveTeacherPhoto name={teacher.full_name} path={teacher.portrait_path} />
        <h1 className="text-2xl font-bold">{teacher.full_name}</h1>
      </div>
      <p className="text-muted-foreground">{teacher.qualification}</p>
      {teacher.experience_years !== null && <p>{teacher.experience_years} سنوات خبرة</p>}
      <p className="whitespace-pre-line leading-7">{teacher.bio}</p>
    </article>
  </div>;
}
