"use server";

import { redirect } from "next/navigation";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";
import { assignmentScope, cairoDate } from "./live-assignment-access";
import { mutationOutcome } from "@/lib/mutation-result";

const read = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export async function publishPortalAssignment(form: FormData) {
  const account = await getAccount();
  const client = ownerClient();
  if (!client || !account?.roles.includes("teacher")) redirect("/account");
  const scope = await assignmentScope(client, "teacher", account.user.id);
  const title = read(form, "title");
  const instructions = read(form, "instructions");
  const course = read(form, "course");
  const due = read(form, "due");
  if (scope.error || !uuid.test(course) || !scope.ids?.includes(course) || title.length < 3 || title.length > 160 ||
    instructions.length < 5 || instructions.length > 5000 || (due && !/^\d{4}-\d{2}-\d{2}$/.test(due))) redirect("/teacher/assignments?message=failed");
  const result = await client.from("course_assignments").insert({ course_id: course, title, instructions, due_on: due || null })
    .select("id").single();
  redirect(`/teacher/assignments?message=${mutationOutcome(result) === "saved" ? "saved" : "failed"}`);
}

export async function submitPortalAssignment(id: string, form: FormData) {
  const account = await getAccount();
  const client = ownerClient();
  if (!client || !account?.roles.includes("student")) redirect("/account");
  const response = read(form, "response");
  const [assignment, scope] = await Promise.all([
    client.from("course_assignments").select("course_id,due_on").eq("id", id).maybeSingle(),
    assignmentScope(client, "student", account.user.id),
  ]);
  if (assignment.error || scope.error || !uuid.test(id) || !assignment.data ||
      !scope.ids?.includes(assignment.data.course_id) || (assignment.data.due_on && assignment.data.due_on < cairoDate()) ||
      !response || response.length > 10000) redirect("/student/assignments?message=failed");
  const result = await client.from("course_assignment_submissions")
    .insert({ assignment_id: id, student_id: account.user.id, response }).select("assignment_id,student_id").single();
  redirect(`/student/assignments?message=${mutationOutcome(result) === "saved" ? "saved" : "failed"}`);
}

export async function reviewPortalAssignment(assignmentId: string, studentId: string, form: FormData) {
  const account = await getAccount();
  const client = ownerClient();
  if (!client || !account?.roles.includes("teacher")) redirect("/account");
  const feedback = read(form, "feedback");
  const [assignment, scope] = await Promise.all([
    client.from("course_assignments").select("course_id").eq("id", assignmentId).maybeSingle(),
    assignmentScope(client, "teacher", account.user.id),
  ]);
  if (assignment.error || scope.error || !uuid.test(assignmentId) || !uuid.test(studentId) || !assignment.data ||
      !scope.ids?.includes(assignment.data.course_id) || !feedback || feedback.length > 5000) redirect("/teacher/reviews?message=failed");
  const result = await client.from("course_assignment_submissions").update({ feedback })
    .eq("assignment_id", assignmentId).eq("student_id", studentId).select("assignment_id,student_id").maybeSingle();
  redirect(`/teacher/reviews?message=${mutationOutcome(result) === "saved" ? "saved" : "failed"}`);
}
