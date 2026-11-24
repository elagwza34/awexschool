import "server-only";
import { ownerClient } from "@/features/auth/supabase-server";

export type AssignmentRole = "admin" | "teacher" | "student" | "parent";
export const cairoDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", dateStyle: "short" }).format(new Date());

export async function assignmentScope(client: NonNullable<ReturnType<typeof ownerClient>>, role: AssignmentRole, userId: string) {
  if (role === "admin") return { ids: null, students: null, error: false };
  if (role === "teacher") {
    const result = await client.from("courses").select("id").eq("teacher_id", userId).eq("status", "published");
    return { ids: result.data?.map(({ id }) => id) ?? [], students: null, error: !!result.error };
  }
  const guardians = role === "parent" ? await client.from("guardian_links").select("student_id").eq("guardian_id", userId) : null;
  const students = role === "student" ? [userId] : guardians?.data?.map(({ student_id }) => student_id) ?? [];
  const result = students.length ? await client.from("course_enrollments")
    .select("course_id,courses!inner(status)").in("requester_id", students)
    .eq("status", "active").eq("courses.status", "published") : null;
  return { ids: [...new Set(result?.data?.map(({ course_id }) => course_id) ?? [])], students, error: !!(result?.error || guardians?.error) };
}
