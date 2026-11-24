import type { SupabaseClient } from "@supabase/supabase-js";
import { configurationFailure, dataFailure, dataReady } from "../../lib/data-result.ts";

export async function loadPublicGroups(client: SupabaseClient | null) {
  if (!client) return configurationFailure();
  const { data, error } = await client.from("learning_groups")
    .select("id,name,weekday,starts_at_local,timezone,course_id,courses!inner(status)")
    .eq("active", true).eq("courses.status", "published").order("name");
  return error ? dataFailure(error) : dataReady(data ?? []);
}
