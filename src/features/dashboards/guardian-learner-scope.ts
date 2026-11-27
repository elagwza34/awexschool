import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type GuardianLink = {
  student_id: string;
  profiles: { status: string } | { status: string }[] | null;
};

export async function activeLinkedStudentIds(client: SupabaseClient, guardianId: string) {
  const guardians = await client.from("guardian_links")
    .select("student_id,profiles!guardian_links_student_id_fkey!inner(status)")
    .eq("guardian_id", guardianId).eq("profiles.status", "active");
  if (guardians.error) return { ids: [] as string[], error: true };

  const linkedIds = [...new Set(((guardians.data ?? []) as GuardianLink[])
    .filter(({ profiles }) => (Array.isArray(profiles) ? profiles[0] : profiles)?.status === "active")
    .map(({ student_id }) => student_id))];
  if (!linkedIds.length) return { ids: [], error: false };

  const roles = await client.from("account_roles").select("user_id")
    .in("user_id", linkedIds).eq("role_code", "student");
  if (roles.error) return { ids: [] as string[], error: true };
  const currentStudents = new Set((roles.data ?? []).map(({ user_id }) => user_id));
  return { ids: linkedIds.filter((studentId) => currentStudents.has(studentId)), error: false };
}
