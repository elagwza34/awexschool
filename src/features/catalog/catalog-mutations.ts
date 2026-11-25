import type { SupabaseClient } from "@supabase/supabase-js";
import type { MutationOutcome } from "../../lib/mutation-result.ts";

const catalogId = /^[a-z0-9-]{1,120}$/i;
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export function readCoursePublication(form: FormData) {
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const track = String(form.get("track") ?? "");
  const grade = String(form.get("grade") ?? "").trim();
  const subject = String(form.get("subject") ?? "").trim();
  if (title.length < 3 || title.length > 160 || description.length > 3000 ||
      !["arabic", "languages"].includes(track) || !catalogId.test(grade) || !catalogId.test(subject)) return null;
  return { title, description, track, grade, subject };
}

export function readEnrollmentReview(course: string, requester: string, form: FormData) {
  const status = String(form.get("status") ?? "").trim();
  if ((status !== "active" && status !== "declined") || !uuid.test(course) || !uuid.test(requester)) return null;
  return { course, requester, status };
}

export async function applyEnrollmentReview(
  client: SupabaseClient,
  review: NonNullable<ReturnType<typeof readEnrollmentReview>>,
): Promise<MutationOutcome> {
  const { data, error } = await client.rpc("review_course_enrollment_as_admin", {
    p_course: review.course,
    p_requester: review.requester,
    p_status: review.status,
  });
  if (error) return "failed";
  return data === true ? "saved" : "not_found";
}
