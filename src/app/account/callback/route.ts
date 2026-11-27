import { NextResponse } from "next/server";
import { authConfig, sessionClient } from "@/features/auth/supabase-server";
import { bootstrapOwner } from "@/features/auth/owner-bootstrap";

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
  else if (await bootstrapOwner(data.user) === "failed") destination.searchParams.set("message", "owner");
  return NextResponse.redirect(destination);
}
