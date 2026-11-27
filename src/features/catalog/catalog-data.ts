import type { SupabaseClient } from "@supabase/supabase-js";
import { configurationFailure, dataFailure, dataReady } from "../../lib/data-result.ts";

export interface EnrollmentLearner {
  student_id: string;
  profiles: { display_name: string; status: string };
}

export interface CourseEnrollment {
  course_id: string;
  requester_id: string;
  student_id: string | null;
  learner_name: string | null;
  status: string;
  student: { display_name: string } | null;
}

export function resolveCourseEnrollment(
  enrollments: CourseEnrollment[],
  courseId: string,
  learnerId: string,
): CourseEnrollment | undefined {
  const learnerEnrollments = enrollments.filter((row) => row.course_id === courseId && (
    row.student_id !== null
      ? row.student_id === learnerId
      : row.requester_id === learnerId
  ));
  for (const status of ["active", "pending", "declined"]) {
    const enrollment = learnerEnrollments.find((row) => row.status === status);
    if (enrollment) return enrollment;
  }
  return undefined;
}

function singleRelation<T>(relation: T | T[] | null | undefined): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

type SearchableCourse = {
  title: string;
  grade_id: string | null;
  subject_id: string | null;
  track: string;
  subjects?: { name: string } | { name: string }[] | null;
  teacher_profiles?: { full_name: string } | { full_name: string }[] | null;
};

export function filterPublishedCatalog<T extends SearchableCourse>(
  courses: T[],
  filters: { q: string; grade: string; subject: string; track?: string },
) {
  const needle = filters.q.trim().toLocaleLowerCase("ar");
  return courses.filter((course) =>
    (!filters.grade || course.grade_id === filters.grade) &&
    (!filters.subject || course.subject_id === filters.subject) &&
    (!filters.track || course.track === filters.track) &&
    (!needle || [course.title, singleRelation(course.subjects)?.name, singleRelation(course.teacher_profiles)?.full_name]
      .some((value) => value?.toLocaleLowerCase("ar").includes(needle))),
  );
}

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

export async function loadEnrollmentLearners(client: SupabaseClient | null, guardianId: string) {
  if (!client) return configurationFailure();
  const { data, error } = await client.from("guardian_links")
    .select("student_id,profiles!guardian_links_student_id_fkey(display_name,status)")
    .eq("guardian_id", guardianId).eq("profiles.status", "active");
  const learners = (data ?? []).map(({ student_id, profiles }) => ({
    student_id,
    profiles: singleRelation(profiles),
  })).filter((learner): learner is EnrollmentLearner => learner.profiles !== null);
  return error ? dataFailure(error) : dataReady(learners);
}

export async function loadCourseEnrollments(client: SupabaseClient | null) {
  if (!client) return configurationFailure();
  const { data, error } = await client.from("course_enrollments")
    .select("course_id,requester_id,student_id,learner_name,status,student:profiles!course_enrollments_student_id_fkey(display_name)")
    .order("created_at", { ascending: false });
  const enrollments: CourseEnrollment[] = (data ?? []).map((row) => ({
    ...row,
    student: singleRelation(row.student),
  }));
  return error ? dataFailure(error) : dataReady(enrollments);
}
