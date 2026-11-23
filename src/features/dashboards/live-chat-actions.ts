"use server";

import { redirect } from "next/navigation";
import { getAccount, sessionClient } from "@/features/auth/supabase-server";

export async function sendPortalMessage(path: string, threadId: string, form: FormData) {
  const account = await getAccount();
  const client = await sessionClient();
  if (!account || !client) redirect("/login");
  const match = /^\/(admin|teacher|student|parent)\/(admin-chat|chat)$/.exec(path);
  if (!match || !account.roles.some((role) => role === match[1] || (match[1] === "admin" && role === "owner"))) redirect("/account");
  const body = String(form.get("body") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(threadId) || !body || body.length > 2000) redirect(`${path}?message=invalid`);
  const { error } = await client.from("chat_messages").insert({ thread_id: threadId, sender_id: account.user.id, body });
  redirect(`${path}?thread=${threadId}${error ? "&message=failed" : ""}`);
}

export async function createChatThread(path: string, formData: FormData) {
  const account = await getAccount();
  const client = await sessionClient(true);
  if (!account || !client) redirect("/login");
  const match = /^\/(admin|teacher|student|parent)\/(admin-chat|chat)$/.exec(path);
  if (!match || !account.roles.some((role) => role === match[1] || (match[1] === "admin" && role === "owner"))) redirect("/account");
  const { data: thread, error } = await client.from("chat_threads").insert({ group_id: null }).select("id").single();
  if (error || !thread) redirect(`${path}?message=failed`);
  const { error: pError } = await client.from("chat_participants").insert({ thread_id: thread.id, user_id: account.user.id });
  if (pError) redirect(`${path}?message=failed`);
  redirect(`${path}?thread=${thread.id}`);
}
