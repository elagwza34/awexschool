"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";
import { mutationOutcome } from "@/lib/mutation-result";
import { readCoursePublication } from "./catalog-mutations";

async function requireCatalogAdmin() {
  const account = await getAccount();
  const client = ownerClient();
  if (!client || !account?.roles.some((role) => role === "owner" || role === "admin")) redirect("/account");
  return client;
}

export async function publishCourse(form: FormData) {
  const client = await requireCatalogAdmin();
  const publication = readCoursePublication(form);
  if (!publication) redirect("/admin/catalog?notice=publish-failed");
  const { title, description, track, grade, subject } = publication;
  const [gradeRow, subjectRow] = await Promise.all([
    client.from("grades").select("id").eq("id", grade).maybeSingle(),
    client.from("subjects").select("id").eq("id", subject).maybeSingle(),
  ]);
  if (gradeRow.error || subjectRow.error || !gradeRow.data || !subjectRow.data) {
    redirect(`/admin/catalog?track=${track}&notice=publish-failed`);
  }
  const slug = randomUUID();
  const result = await client.from("courses").insert({
    slug, title, description, track, status: "published",
    grade_id: grade, subject_id: subject,
  }).select("id").single();
  redirect(mutationOutcome(result) === "saved"
    ? `/admin/catalog?track=${track}&notice=published&published=${slug}`
    : `/admin/catalog?track=${track}&notice=publish-failed`);
}

export async function archiveCourse(course: string, track: string) {
  const client = await requireCatalogAdmin();
  const destination = `/admin/catalog?track=${track === "languages" ? "languages" : "arabic"}`;
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(course)) redirect(`${destination}&notice=archive-failed`);
  const { data, error } = await client.from("courses").update({ status: "archived" })
    .eq("id", course).eq("status", "published").select("id").maybeSingle();
  if (error || !data) redirect(`${destination}&notice=archive-failed`);
  revalidatePath("/courses");
  revalidatePath(`/courses/${course}`);
  revalidatePath("/groups");
  redirect(`${destination}&notice=archived`);
}

export async function reviewEnrollment(course: string, requester: string, form: FormData) {
  const client = await requireCatalogAdmin();
  const status = String(form.get("status") ?? "");
  const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
  if ((status !== "active" && status !== "declined") || !uuid.test(course) || !uuid.test(requester)) {
    redirect("/admin/catalog?tab=enrollments&notice=invalid");
  }
  const result = await client.from("course_enrollments").update({ status })
    .eq("course_id", course).eq("requester_id", requester).eq("status", "pending")
    .select("course_id,requester_id").maybeSingle();
  redirect(`/admin/catalog?tab=enrollments&notice=${mutationOutcome(result) === "saved" ? "reviewed" : "failed"}`);
}
