import "server-only";
import { ownerClient } from "@/features/auth/supabase-server";

export type AssignmentRole = "admin" | "teacher" | "student" | "parent";
export const cairoDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", dateStyle: "short" }).format(new Date());

export async function assignmentScope(client: NonNullable<ReturnType<typeof ownerClient>>, role: AssignmentRole, userId: string) {
  if (role === "admin") return { ids: null, students: null, error: false };
  if (role === "teacher") {
    const [owned, groups] = await Promise.all([
      client.from("courses").select("id").eq("teacher_id", userId).eq("status", "published"),
      client.from("learning_groups").select("course_id,courses!inner(status)")
        .eq("teacher_id", userId).eq("active", true).eq("courses.status", "published"),
    ]);
    const ids = [...new Set([
      ...(owned.data?.map(({ id }) => id) ?? []),
      ...(groups.data?.map(({ course_id }) => course_id) ?? []),
    ])];
    return { ids, students: null, error: !!(owned.error || groups.error) };
  }
  let students = role === "student" ? [userId] : [];
  let scopeError = false;
  if (role === "parent") {
    const guardians = await client.from("guardian_links")
      .select("student_id,profiles!inner(status)")
      .eq("guardian_id", userId).eq("profiles.status", "active");
    scopeError = !!guardians.error;
    students = [...new Set((guardians.data ?? [])
      .filter(({ profiles }) => (Array.isArray(profiles) ? profiles[0] : profiles)?.status === "active")
      .map(({ student_id }) => student_id))];
    if (students.length) {
      const roles = await client.from("account_roles").select("user_id")
        .in("user_id", students).eq("role_code", "student");
      scopeError = scopeError || !!roles.error;
      const currentStudents = new Set((roles.data ?? []).map(({ user_id }) => user_id));
      students = students.filter((studentId) => currentStudents.has(studentId));
    }
  }
  const result = students.length ? await client.from("course_enrollments")
    .select("course_id,courses!inner(status)").in("student_id", students)
    .eq("status", "active").eq("courses.status", "published") : null;
  return { ids: [...new Set(result?.data?.map(({ course_id }) => course_id) ?? [])], students, error: scopeError || !!result?.error };
}
