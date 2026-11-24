import "server-only";
import { cache } from "react";
import { ownerClient } from "@/features/auth/supabase-server";
import { loadCatalogOptions, loadPublishedCourse, loadPublishedCourses } from "./catalog-data";

export async function listCatalogOptions() {
  return loadCatalogOptions(ownerClient());
}

export const listPublishedCourses = cache(async () => loadPublishedCourses(ownerClient()));

export const readPublishedCourse = cache(async (id: string) => loadPublishedCourse(ownerClient(), id));
