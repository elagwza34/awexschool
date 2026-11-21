"use server";

import { redirect } from "next/navigation";
import { getAccount, ownerClient, sessionClient } from "@/features/auth/supabase-server";
import { readPublishedCourse } from "./live-catalog";

export async function enrollInCourse(id: string, form: FormData) {
  const course = await readPublishedCourse(id);
  if (!course) redirect("/courses");
  const destination = `/courses/${course.id}`;
  const account = await getAccount();
  if (!account) redirect(`/login?next=${encodeURIComponent(destination)}`);
  const parent = account.roles.includes("parent");
  if (!parent && !account.roles.includes("student")) redirect(`${destination}?enrollment=role`);
  const learnerName = parent ? String(form.get("learner") ?? "").trim() : account.name.trim();
  if (learnerName.length < 2 || learnerName.length > 100) redirect(`${destination}?enrollment=invalid`);

  const { error } = await ownerClient()!.from("course_enrollments").upsert({
    requester_id: account.user.id, course_id: course.id, learner_name: learnerName,
  }, { onConflict: "requester_id,course_id", ignoreDuplicates: true });
  redirect(error ? `${destination}?enrollment=failed` : destination);
}

export async function getCourseEnrollments() {
  const session = await sessionClient();
  if (!session) return [];
  const { data } = await session.from("course_enrollments")
    .select("course_id, learner_name, status").order("created_at", { ascending: false });
  return data ?? [];
}
