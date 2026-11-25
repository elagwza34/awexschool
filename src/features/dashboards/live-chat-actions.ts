"use server";

import { getAccount, sessionClient } from "@/features/auth/supabase-server";
import type { ChatRole } from "./chat-workspace";
import { canInvokeLiveChatAction, validateDirectChatMessage } from "./chat-safety";

export async function sendPortalMessage(
  role: ChatRole, administration: boolean, contact: string, draft: string,
  attachment: { key: string; name: string } | null,
) {
  if (!canInvokeLiveChatAction()) return { ok: false };
  const [account, client] = await Promise.all([getAccount(), sessionClient(true)]);
  if (!account || !client) return { ok: false };
  if (!validateDirectChatMessage({
    role,
    administration,
    accountId: account.user.id,
    contactId: contact,
    body: draft,
    attachment,
  })) return { ok: false };

  const body = draft.trim();
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
