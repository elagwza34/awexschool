import { redirect } from "next/navigation";
import { LiveTeacherPhoto } from "@/components/live-teacher-photo";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";

export default async function TeacherProfilePage() {
  const account = await getAccount();
  if (!account?.roles.includes("teacher")) redirect("/account");
  const result = await ownerClient()?.from("teacher_profiles")
    .select("full_name,qualification,bio,experience_years,portrait_path")
    .eq("user_id", account.user.id).maybeSingle();
  const profile = result?.data;
  const name = profile?.full_name ?? account.name;

  return <main id="main-content" className="container-shell space-y-4 pt-5 pb-10">
    <h1 className="text-2xl font-bold">الملف الشخصي</h1>
    <article className="soft-card space-y-4 p-5">
      <div className="flex items-center gap-4">
        <LiveTeacherPhoto name={name} path={profile?.portrait_path ?? null} />
        <div className="min-w-0">
          <h2 className="break-words text-xl font-bold">{name}</h2>
          {profile?.qualification && <p className="text-sm text-muted-foreground">{profile.qualification}</p>}
        </div>
      </div>
      {profile?.bio && <p className="whitespace-pre-line leading-7">{profile.bio}</p>}
      {profile?.experience_years != null && <p className="text-sm font-semibold">سنوات الخبرة: {profile.experience_years.toLocaleString("ar-EG")}</p>}
      {result?.error && <p role="status" className="text-sm text-muted-foreground">تعذّر تحميل تفاصيل الملف حاليًا.</p>}
    </article>
  </main>;
}
