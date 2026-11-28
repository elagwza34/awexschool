"use server";

import { redirect } from "next/navigation";
import { getAccount, sessionClient } from "@/features/auth/supabase-server";

const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

export async function completeLesson(courseId: string, lessonId: string) {
  if (!uuid.test(courseId) || !uuid.test(lessonId)) redirect("/courses");
  const path = `/courses/${courseId}/lessons`;
  const account = await getAccount();
  if (!account?.roles.includes("student")) redirect(path);

  const client = await sessionClient(true);
  if (!client) redirect(`${path}?progress=failed`);
  const { data: lesson, error: lookupError } = await client.from("lessons")
    .select("id,course_units!inner(course_id)")
    .eq("id", lessonId).eq("course_units.course_id", courseId).maybeSingle();
  if (lookupError || !lesson) redirect(`${path}?progress=failed`);

  const { error } = await client.from("lesson_completions").insert({ lesson_id: lessonId });
  // A concurrent retry can encounter the existing unique completion.
  if (error && error.code !== "23505") redirect(`${path}?progress=failed`);
  const { data: persisted, error: readError } = await client.from("lesson_completions")
    .select("lesson_id").eq("lesson_id", lessonId).maybeSingle();
  if (readError || !persisted) redirect(`${path}?progress=failed`);
  redirect(path);
}
