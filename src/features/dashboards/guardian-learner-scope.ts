import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

// Use the guardian's session client. The guardian_links policy verifies both active roles.
export async function activeLinkedStudentIds(client: SupabaseClient, guardianId: string) {
  const { data, error } = await client.from("guardian_links")
    .select("student_id")
    .eq("guardian_id", guardianId);
  if (error) return { ids: [] as string[], error: true };
  return { ids: [...new Set((data ?? []).map(({ student_id }) => student_id as string))], error: false };
}
