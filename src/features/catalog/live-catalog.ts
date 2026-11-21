import "server-only";
import { cache } from "react";
import { ownerClient } from "@/features/auth/supabase-server";

const fields = "id, title, description, track, grade_id, subject_id, grades(name), subjects(name), teacher_profiles(user_id,full_name,portrait_path)";

export async function listCatalogOptions() {
  const client = ownerClient();
  if (!client) return { grades: [], subjects: [] };
  const [grades, subjects] = await Promise.all([
    client.from("grades").select("id,name").order("stage_id").order("position"),
    client.from("subjects").select("id,name").order("name"),
  ]);
  return { grades: grades.data ?? [], subjects: subjects.data ?? [] };
}

export const listPublishedCourses = cache(async () => {
  const client = ownerClient();
  if (!client) return [];
  const { data } = await client.from("courses").select(fields).eq("status", "published").order("created_at", { ascending: false });
  return data ?? [];
});

export const readPublishedCourse = cache(async (id: string) => {
  const client = ownerClient();
  const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);
  if (!client || (!uuid && !/^[a-z0-9-]{1,120}$/.test(id))) return null;
  const { data } = await client.from("courses").select(fields).eq(uuid ? "id" : "slug", id).eq("status", "published").maybeSingle();
  return data;
});
