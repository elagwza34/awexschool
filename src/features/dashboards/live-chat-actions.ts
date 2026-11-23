"use server";

import { getAccount, sessionClient } from "@/features/auth/supabase-server";
import type { ChatRole } from "./chat-workspace";

export async function sendPortalMessage(
  role: ChatRole, administration: boolean, contact: string, draft: string,
  attachment: { key: string; name: string } | null,
) {
  const body = typeof draft === "string" ? draft.trim() : "";
  if ((!body && !attachment) || body.length > 2000) return { ok: false };

  const [account, client] = await Promise.all([getAccount(), sessionClient(true)]);
  if (!account || !client) return { ok: false };

  const { error } = await client.rpc("send_direct_chat", {
    p_role: role,
    p_admin: administration,
    p_contact: contact,
    p_body: body,
    p_key: attachment?.key ?? null,
    p_filename: attachment?.name ?? null,
  });
  return { ok: !error };
}
