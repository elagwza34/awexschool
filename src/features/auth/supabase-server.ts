import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";
import { defaultSocialLinks, type SocialLinksConfig } from "./social-links";
import { readSupabaseEnvironment } from "@/lib/environment";

export function authConfig() {
  const config = readSupabaseEnvironment();
  return config ? { url: config.url, key: config.key } : null;
}

export async function sessionClient(writable = false) {
  const config = authConfig();
  if (!config) return null;
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(items) {
        if (writable) for (const { name, value, options } of items) {
          jar.set(name, value, { ...options, secure: process.env.NODE_ENV === "production" });
        }
      },
    },
  });
}

export function ownerClient() {
  const environment = readSupabaseEnvironment();
  const key = environment?.secretKey;
  return environment && key ? createClient(environment.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) : null;
}

export const getAccount = cache(async function () {
  const client = await sessionClient();
  if (!client) return null;
  const { data: { user } } = await client.auth.getUser();
  if (!user?.email_confirmed_at) return null;
  const [profile, roles] = await Promise.all([
    client.from("profiles").select("display_name,status").eq("user_id", user.id).maybeSingle(),
    client.from("account_roles").select("role_code").eq("user_id", user.id),
  ]);
  if (profile.error || roles.error || profile.data?.status !== "active") return null;
  const assignedRoles = roles.data.map(({ role_code }) => role_code as string);
  return { user, name: profile.data.display_name as string, roles: assignedRoles.includes("owner") ? ["owner"] : assignedRoles };
});

export const isDemoEnabled = cache(async function () {
  const config = authConfig();
  if (!config) return true;
  const client = createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  const { data, error } = await client.from("site_settings").select("demo_enabled").single();
  return !error && data?.demo_enabled === true;
});

export const getSocialLinks = cache(async function (): Promise<SocialLinksConfig> {
  const config = authConfig();
  if (!config) return defaultSocialLinks;
  const client = createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  const { data } = await client.from("site_settings").select("social_links").maybeSingle();
  return { ...defaultSocialLinks, ...data?.social_links };
});
