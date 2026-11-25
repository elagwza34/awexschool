"use server";

import { redirect } from "next/navigation";
import { getAccount, sessionClient } from "@/features/auth/supabase-server";
import { readPublishedCourse } from "./live-catalog";
import { loadCourseEnrollments, loadEnrollmentLearners } from "./catalog-data";

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

function enrollmentErrorNotice(error: unknown) {
  const message = error instanceof Error ? error.message
    : typeof error === "object" && error !== null && "message" in error ? String(error.message) : "";
  if (message.includes("enrollment_learner_conflict")) return "conflict";
  if (message.includes("enrollment_identity_unresolved")) return "identity";
  return "failed";
}

export async function enrollInCourse(id: string, form: FormData) {
  const courseResult = await readPublishedCourse(id);
  if (courseResult.state === "error") redirect("/courses?enrollment=unavailable");
  const course = courseResult.data;
  if (!course) redirect("/courses");
  const destination = `/courses/${course.id}`;
  const account = await getAccount();
  if (!account) redirect(`/login?next=${encodeURIComponent(destination)}`);
  const parent = account.roles.includes("parent");
  if (!parent && !account.roles.includes("student")) redirect(`${destination}?enrollment=role`);

  const client = await sessionClient(true);
  if (!client) redirect(`${destination}?enrollment=failed`);
  let studentId: string | null = null;
  if (parent) {
    const selected = String(form.get("student") ?? "").trim();
    if (!uuid.test(selected)) redirect(`${destination}?enrollment=invalid`);
    const learners = await loadEnrollmentLearners(client, account.user.id);
    if (learners.state === "error") redirect(`${destination}?enrollment=failed`);
    if (!learners.data.some(({ student_id }) => student_id === selected)) redirect(`${destination}?enrollment=invalid`);
    studentId = selected;
  }

  const { data, error } = await client.rpc("request_course_enrollment", {
    p_course: course.id,
    p_student: studentId,
  });
  if (error) redirect(`${destination}?enrollment=${enrollmentErrorNotice(error)}`);
  if (data !== true && data !== false) redirect(`${destination}?enrollment=failed`);
  redirect(destination);
}

export async function getCourseEnrollments() {
  return loadCourseEnrollments(await sessionClient());
}

export async function getEnrollmentLearners() {
  const account = await getAccount();
  if (!account) return { state: "error", kind: "configuration" } as const;
  return loadEnrollmentLearners(await sessionClient(), account.user.id);
}
