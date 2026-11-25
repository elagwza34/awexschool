import "server-only";
import { cache } from "react";
import { sessionClient } from "@/features/auth/supabase-server";
import { loadCatalogOptions, loadPublishedCourse, loadPublishedCourses } from "./catalog-data";

export async function listCatalogOptions() {
  return loadCatalogOptions(await sessionClient());
}

export const listPublishedCourses = cache(async () => loadPublishedCourses(await sessionClient()));

export const readPublishedCourse = cache(async (id: string) => loadPublishedCourse(await sessionClient(), id));
