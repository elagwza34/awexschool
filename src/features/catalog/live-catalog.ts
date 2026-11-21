import "server-only";
import { cache } from "react";
import { ownerClient } from "@/features/auth/supabase-server";

const fields = "id, title, description, track, grade_id, subject_id, grades(name), subjects(name)";

export const listPublishedCourses = cache(async () => {
  const client = ownerClient();
  if (!client) return [];
  const { data } = await client.from("courses").select(fields).eq("status", "published").order("created_at", { ascending: false });
  return data ?? [];
});

export const readPublishedCourse = cache(async (id: string) => {
  const client = ownerClient();
  if (!client || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return null;
  const { data } = await client.from("courses").select(fields).eq("id", id).eq("status", "published").maybeSingle();
  return data;
});
