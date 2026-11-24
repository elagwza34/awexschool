import { createBrowserClient } from "@supabase/ssr";
import { readSupabaseEnvironment } from "./environment";

export function readPublicSupabaseEnvironment() {
  return readSupabaseEnvironment({
    NODE_ENV: process.env.NODE_ENV,
    LIVESCHOOL_ENV: process.env.LIVESCHOOL_ENV,
    NEXT_PUBLIC_LIVESCHOOL_ENV: process.env.NEXT_PUBLIC_LIVESCHOOL_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function createClient() {
  const config = readPublicSupabaseEnvironment();
  if (!config) throw new Error("Supabase is not configured.");
  return createBrowserClient(config.url, config.key);
}