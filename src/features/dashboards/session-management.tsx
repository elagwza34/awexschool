import { getAccount, ownerClient } from "@/features/auth/supabase-server";
import { cairoSessionInput } from "./session-time";
import { SessionEditor } from "./session-editor";

export async function SessionManagement() {
  const account = await getAccount();
  if (!account?.roles.some((role) => role === "admin" || role === "owner")) return null;
  const client = ownerClient();
  if (!client) return <p role="alert">تعذّر تحميل إدارة الحصص.</p>;
  const [groupResult, sessionResult] = await Promise.all([
    client.from("learning_groups").select("id,name,teacher_id,teacher_profiles(full_name)").eq("active", true).order("name")
      .overrideTypes<{ id: string; name: string; teacher_id: string; teacher_profiles: { full_name: string } | null }[], { merge: false }>(),
    client.from("class_sessions").select("id,group_id,title,starts_at,ends_at").eq("status", "scheduled")
      .gt("starts_at", new Date().toISOString()).order("starts_at").limit(50),
  ]);
  if (groupResult.error || sessionResult.error) return <p role="alert">تعذّر تحميل إدارة الحصص.</p>;
  const groups = groupResult.data.map((group) => ({
    id: group.id, name: group.name, teacherId: group.teacher_id,
    teacherName: group.teacher_profiles?.full_name ?? "المدرس المعيّن",
  }));
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">إدارة الحصص</h1>
      {groups.length ? <SessionEditor groups={groups} /> : <p>أنشئ مجموعة نشطة أولًا.</p>}
      {sessionResult.data.map((item) => (
        <details className="soft-card p-3" key={item.id}>
          <summary className="cursor-pointer font-semibold">{item.title}</summary>
          <SessionEditor groups={groups} item={{
            id: item.id, title: item.title, groupId: item.group_id,
            starts: cairoSessionInput(new Date(item.starts_at)),
            duration: Math.round((Date.parse(item.ends_at) - Date.parse(item.starts_at)) / 60000),
          }} />
        </details>
      ))}
    </section>
  );
}
