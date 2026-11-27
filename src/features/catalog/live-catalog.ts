import "server-only";
import { cache } from "react";
import { sessionClient } from "@/features/auth/supabase-server";
import { configurationFailure, dataFailure, dataReady } from "../../lib/data-result.ts";
import { loadCatalogOptions, loadPublishedCourse, loadPublishedCourses } from "./catalog-data";

export async function listCatalogOptions() {
  return loadCatalogOptions(await sessionClient());
}

export const listPublishedCourses = cache(async () => loadPublishedCourses(await sessionClient()));

export const readPublishedCourse = cache(async (id: string) => loadPublishedCourse(await sessionClient(), id));

export const listEducationHierarchy = cache(async () => {
  const client = await sessionClient();
  if (!client) return configurationFailure();
  const [stages, grades, subjects] = await Promise.all([
    client.from("stages").select("id,name").order("position"),
    client.from("grades").select("id,name,stage_id").order("stage_id").order("position"),
    client.from("subjects").select("id,name").order("name"),
  ]);
  return stages.error || grades.error || subjects.error
    ? dataFailure(stages.error ?? grades.error ?? subjects.error)
    : dataReady({ stages: stages.data ?? [], grades: grades.data ?? [], subjects: subjects.data ?? [] });
});

type PublicTeacher = {
  user_id: string;
  full_name: string;
  qualification: string | null;
  bio: string | null;
  experience_years: number | null;
  portrait_path: string | null;
};

export const listPublicTeacherCards = cache(async () => {
  const client = await sessionClient();
  if (!client) return configurationFailure();
  const { data, error } = await client.from("teacher_profiles")
    .select("user_id,full_name,qualification,bio,experience_years,portrait_path").order("full_name")
    .overrideTypes<PublicTeacher[], { merge: false }>();
  return error ? dataFailure(error) : dataReady(data ?? []);
});
