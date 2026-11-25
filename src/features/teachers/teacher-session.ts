import type { SupabaseClient } from "@supabase/supabase-js";

export async function readTeacherSessionAccount(client: SupabaseClient) {
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user?.email || !user.email_confirmed_at) return null;

  const [profile, roles] = await Promise.all([
    client.from("profiles").select("display_name,status").eq("user_id", user.id).maybeSingle(),
    client.from("account_roles").select("role_code").eq("user_id", user.id),
  ]);
  if (profile.error || roles.error || profile.data?.status !== "active") return null;
  return {
    user,
    name: profile.data.display_name as string,
    roles: roles.data.map(({ role_code }) => role_code as string),
  };
}
