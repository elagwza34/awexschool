"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";

async function requireCatalogAdmin() {
  const account = await getAccount();
  const client = ownerClient();
  if (!client || !account?.roles.some((role) => role === "owner" || role === "admin")) redirect("/account");
  return client;
}

export async function publishCourse(form: FormData) {
  const client = await requireCatalogAdmin();
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const track = String(form.get("track") ?? "");
  if (title.length < 3 || title.length > 160 || description.length > 3000 || !["arabic", "languages"].includes(track)) {
    redirect("/admin/catalog?notice=publish-failed");
  }
  const slug = randomUUID();
  const { error } = await client.from("courses").insert({
    slug, title, description, track, status: "published",
    grade_id: String(form.get("grade") ?? ""), subject_id: String(form.get("subject") ?? ""),
  });
  redirect(error ? "/admin/catalog?notice=publish-failed" : `/admin/catalog?notice=published&published=${slug}`);
}

export async function reviewEnrollment(course: string, requester: string, form: FormData) {
  const client = await requireCatalogAdmin();
  const status = String(form.get("status") ?? "");
  if (status !== "active" && status !== "declined") redirect("/admin/catalog?notice=invalid");
  const { error } = await client.from("course_enrollments").update({ status })
    .eq("course_id", course).eq("requester_id", requester).eq("status", "pending");
  redirect(error ? "/admin/catalog?notice=failed" : "/admin/catalog?notice=reviewed");
}
