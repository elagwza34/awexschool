"use server";

import { redirect } from "next/navigation";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";
import { assignmentScope, cairoDate } from "./live-assignment-access";

const read = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

export async function publishPortalAssignment(form: FormData) {
  const account = await getAccount();
  const client = ownerClient();
  if (!client || !account?.roles.includes("teacher")) redirect("/account");
  const scope = await assignmentScope(client, "teacher", account.user.id);
  const title = read(form, "title");
  const instructions = read(form, "instructions");
  const course = read(form, "course");
  const due = read(form, "due");
  if (!scope.ids?.includes(course) || title.length < 3 || title.length > 160 ||
    instructions.length < 5 || instructions.length > 5000 || (due && !/^\d{4}-\d{2}-\d{2}$/.test(due))) redirect("/teacher/assignments?message=failed");
  const { error } = await client.from("course_assignments").insert({ course_id: course, title, instructions, due_on: due || null });
  redirect(`/teacher/assignments?message=${error ? "failed" : "saved"}`);
}

export async function submitPortalAssignment(id: string, form: FormData) {
  const account = await getAccount();
  const client = ownerClient();
  if (!client || !account?.roles.includes("student")) redirect("/account");
  const response = read(form, "response");
  const [{ data }, scope] = await Promise.all([
    client.from("course_assignments").select("course_id,due_on").eq("id", id).maybeSingle(),
    assignmentScope(client, "student", account.user.id),
  ]);
  if (!data || !scope.ids?.includes(data.course_id) || (data.due_on && data.due_on < cairoDate()) || !response || response.length > 10000) redirect("/student/assignments?message=failed");
  const { error } = await client.from("course_assignment_submissions").insert({ assignment_id: id, student_id: account.user.id, response });
  redirect(`/student/assignments?message=${error ? "failed" : "saved"}`);
}

export async function reviewPortalAssignment(assignmentId: string, studentId: string, form: FormData) {
  const account = await getAccount();
  const client = ownerClient();
  if (!client || !account?.roles.includes("teacher")) redirect("/account");
  const feedback = read(form, "feedback");
  const [{ data }, scope] = await Promise.all([
    client.from("course_assignments").select("course_id").eq("id", assignmentId).maybeSingle(),
    assignmentScope(client, "teacher", account.user.id),
  ]);
  if (!data || !scope.ids?.includes(data.course_id) || !feedback || feedback.length > 5000) redirect("/teacher/reviews?message=failed");
  const { error } = await client.from("course_assignment_submissions").update({ feedback })
    .eq("assignment_id", assignmentId).eq("student_id", studentId);
  redirect(`/teacher/reviews?message=${error ? "failed" : "saved"}`);
}
