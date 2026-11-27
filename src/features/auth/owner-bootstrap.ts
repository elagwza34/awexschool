import { authConfig, ownerClient } from "./supabase-server";

type ConfirmableUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
};

export async function bootstrapOwner(user: ConfirmableUser | null | undefined) {
  const accountEmail = user?.email?.trim().toLowerCase();
  const ownerEmail = process.env.LIVESCHOOL_OWNER_EMAIL?.trim().toLowerCase();
  if (!user?.email_confirmed_at || !accountEmail || !ownerEmail || accountEmail !== ownerEmail) return "skipped";
  const config = authConfig();
  const admin = ownerClient();
  if (!config || !admin) return "failed";
  const response = await fetch(new URL("/auth/v1/settings", config.url), {
    headers: { apikey: config.key },
    cache: "no-store",
  }).catch(() => null);
  const settings = response?.ok ? await response.json().catch(() => null) : null;
  if (settings?.mailer_autoconfirm !== false) return "failed";
  const result = await admin.rpc("assign_owner_role", { account_id: user.id });
  return result.error ? "failed" : "assigned";
}
