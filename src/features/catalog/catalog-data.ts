import type { SupabaseClient } from "@supabase/supabase-js";
import { configurationFailure, dataFailure, dataReady } from "../../lib/data-result.ts";

export const catalogFields = "id,title,description,track,grade_id,subject_id,grades(name),subjects(name),teacher_profiles(user_id,full_name,portrait_path)";

export async function loadCatalogOptions(client: SupabaseClient | null) {
  if (!client) return configurationFailure();
  const [grades, subjects] = await Promise.all([
    client.from("grades").select("id,name").order("stage_id").order("position"),
    client.from("subjects").select("id,name").order("name"),
  ]);
  if (grades.error || subjects.error) return dataFailure(grades.error ?? subjects.error);
  return dataReady({ grades: grades.data ?? [], subjects: subjects.data ?? [] });
}

export async function loadPublishedCourses(client: SupabaseClient | null) {
  if (!client) return configurationFailure();
  const { data, error } = await client.from("courses").select(catalogFields)
    .eq("status", "published").order("created_at", { ascending: false });
  return error ? dataFailure(error) : dataReady(data ?? []);
}

export async function loadPublishedCourse(client: SupabaseClient | null, id: string) {
  const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);
  if (!uuid && !/^[a-z0-9-]{1,120}$/i.test(id)) return dataReady(null);
  if (!client) return configurationFailure();
  const { data, error } = await client.from("courses").select(catalogFields)
    .eq(uuid ? "id" : "slug", id).eq("status", "published").maybeSingle();
  return error ? dataFailure(error) : dataReady(data);
}

export async function loadCourseEnrollments(client: SupabaseClient | null) {
  if (!client) return configurationFailure();
  const { data, error } = await client.from("course_enrollments")
    .select("course_id,learner_name,status").order("created_at", { ascending: false });
  return error ? dataFailure(error) : dataReady(data ?? []);
}
