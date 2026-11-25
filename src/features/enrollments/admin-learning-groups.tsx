import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";
import { LiveGroupEditor, type EditableGroup, type StudentOption } from "./live-group-editor";

type GroupRow = EditableGroup & {
  courses: { title: string } | null;
  teacher_profiles: { full_name: string } | null;
  group_members: { count: number }[];
};

export async function AdminLearningGroups({ searchParams }: { searchParams: Promise<{ group?: string; saved?: string }> }) {
  const account = await getAccount();
  const client = ownerClient();
  if (!client || !account?.roles.some((role) => role === "admin" || role === "owner")) redirect("/account");
  const { group, saved } = await searchParams;
  const [groups, courses, teachers, students, enrollments] = await Promise.all([
    client.from("learning_groups").select("*,courses(title),teacher_profiles(full_name),group_members(count)")
      .order("created_at", { ascending: false }).overrideTypes<GroupRow[], { merge: false }>(),
    client.from("courses").select("id,title").eq("status", "published").order("title"),
    client.from("profiles").select("user_id,account_roles!inner(role_code),teacher_profiles!inner(full_name)")
      .eq("status", "active").eq("account_roles.role_code", "teacher")
      .overrideTypes<{ user_id: string; teacher_profiles: { full_name: string } }[], { merge: false }>(),
    client.from("profiles").select("user_id,display_name,account_roles!inner(role_code)")
      .eq("status", "active").eq("account_roles.role_code", "student").order("display_name"),
    client.from("course_enrollments").select("course_id,student_id,requester_id").eq("status", "active")
      .overrideTypes<{ course_id: string; student_id: string | null; requester_id: string }[], { merge: false }>(),
  ]);
  const selected = groups.data?.find(({ id }) => id === group);
  const members = selected ? await client.from("group_members").select("student_id").eq("group_id", selected.id) : null;
  const memberIds = new Set(members?.data?.map(({ student_id }) => student_id));
  const enrollmentCourses = new Map<string, Set<string>>();
  for (const enrollment of enrollments.data ?? []) {
    const studentId = enrollment.student_id ?? enrollment.requester_id;
    const courseIds = enrollmentCourses.get(studentId) ?? new Set<string>();
    courseIds.add(enrollment.course_id);
    enrollmentCourses.set(studentId, courseIds);
  }
  const studentOptions: StudentOption[] = (students.data ?? [])
    .filter(({ user_id }) => !memberIds.has(user_id))
    .map(({ user_id, display_name }) => ({
      id: user_id,
      name: display_name,
      courseIds: [...(enrollmentCourses.get(user_id) ?? [])],
    }))
    .filter(({ courseIds }) => courseIds.length > 0);
  const failed = groups.error || courses.error || teachers.error || students.error || enrollments.error || members?.error;
  return (
    <section aria-labelledby="learning-groups-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="learning-groups-title" className="text-2xl font-bold">إدارة المجموعات الدراسية</h1>
        {!failed && <LiveGroupEditor key={selected ? `edit-${selected.id}` : `create-${saved ?? ""}`} group={selected} memberCount={memberIds.size}
          courses={(courses.data ?? []).map(({ id, title }) => ({ id, name: title }))}
          teachers={(teachers.data ?? []).map(({ user_id, teacher_profiles }) => ({ id: user_id, name: teacher_profiles.full_name }))
            .sort((a, b) => a.name.localeCompare(b.name, "ar"))}
          students={studentOptions} />}
      </div>
      {failed && <p role="alert" className="text-destructive">تعذّر تحميل بيانات المجموعات.</p>}
      {!failed && (!courses.data?.length || !teachers.data?.length) && (
        <p className="text-sm text-muted-foreground">إنشاء مجموعة محتاج مقرر منشور وحساب مدرس نشط.</p>
      )}
      {saved && groups.data?.some(({ id }) => id === saved) && <p role="status" className="rounded-lg bg-accent p-3">تم حفظ المجموعة.</p>}
      {groups.data?.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {groups.data.map((item) => (
            <li key={item.id} className="soft-card space-y-2 p-4">
              <h2 className="font-bold">{item.name}</h2>
              <p className="text-sm text-muted-foreground">{item.courses?.title} · {item.teacher_profiles?.full_name}</p>
              <p className="text-sm">{item.group_members[0]?.count ?? 0} / {item.capacity} طالب · {item.active ? "منشورة" : "غير منشورة"}</p>
              <Button variant="outline" asChild><Link href={`/admin/group-requests?group=${item.id}`}>تعديل وإضافة طلاب</Link></Button>
            </li>
          ))}
        </ul>
      ) : !failed && <p className="soft-card p-4 text-muted-foreground">مفيش مجموعات اتعملت لسه.</p>}
    </section>
  );
}
