import Link from "next/link";
import { PageIntro } from "@/components/shared";
import { ownerClient } from "@/features/auth/supabase-server";
import { loadPublicGroups } from "@/features/catalog/public-groups-data";

export const metadata = { title: "المجموعات الدراسية" };
const weekdays = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];

export default async function GroupsPage() {
  const result = await loadPublicGroups(ownerClient());
  const groups = result.state === "ready" ? result.data : [];
  return <div className="container-shell py-8">
    <PageIntro title="المجموعات الدراسية" />
    {result.state === "error" && <p role="alert" className="soft-card mb-4 p-5 text-destructive">تعذّر تحميل المجموعات حاليًا.</p>}
    {groups.length ? <ul className="grid gap-4 md:grid-cols-3">{groups.map((group) => (
      <li key={group.id} className="soft-card space-y-2 p-5">
        <h2 className="font-bold">{group.name}</h2>
        <p className="text-sm text-muted-foreground">{weekdays[group.weekday - 1]} · <bdi>{group.starts_at_local.slice(0, 5)} · {group.timezone}</bdi></p>
        <Link href={`/courses/${group.course_id}`} className="inline-flex min-h-11 items-center text-primary underline">عرض المقرر</Link>
      </li>
    ))}</ul> : result.state === "ready" && <p className="soft-card p-5">لا توجد مجموعات منشورة حاليًا.</p>}
  </div>;
}
