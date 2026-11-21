import { NextResponse } from "next/server";
import { authConfig, ownerClient, sessionClient } from "@/features/auth/supabase-server";

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const destination = new URL("/account", process.env.LIVESCHOOL_WEB_ORIGIN ?? incoming.origin);
  const code = incoming.searchParams.get("code");
  const client = await sessionClient(true);
  const config = authConfig();
  if (!code || !client || !config) {
    destination.searchParams.set("message", "callback");
    return NextResponse.redirect(destination);
  }
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error) destination.searchParams.set("message", "callback");
  else if (data.user.email_confirmed_at &&
    data.user.email?.toLowerCase() === process.env.LIVESCHOOL_OWNER_EMAIL?.trim().toLowerCase()) {
    const admin = ownerClient();
    const response = await fetch(new URL("/auth/v1/settings", config.url), { headers: { apikey: config.key }, cache: "no-store" }).catch(() => null);
    const settings = response?.ok ? await response.json().catch(() => null) : null;
    if (settings?.mailer_autoconfirm === false && admin) {
      const result = await admin.from("account_roles").upsert({
        user_id: data.user.id, role_code: "owner",
      }, { onConflict: "user_id,role_code", ignoreDuplicates: true });
      if (result.error) destination.searchParams.set("message", "owner");
    } else destination.searchParams.set("message", "owner");
  }
  return NextResponse.redirect(destination);
}
