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
