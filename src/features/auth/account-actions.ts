"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { authConfig, getAccount, ownerClient, sessionClient } from "./supabase-server";
import { socialChannels, type SocialLinksConfig } from "./social-links";

const managedRoles = new Set(["student", "parent", "teacher", "support", "manager", "admin"]);
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const validEmail = (email: string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validPassword = (password: string) => password.length >= 12 && Buffer.byteLength(password) <= 72;

export async function signIn(form: FormData) {
  const client = await sessionClient(true);
  if (!client) redirect("/login?message=unavailable");
  const requested = text(form, "next");
  const next = /^\/courses\/[a-f0-9-]{36}$/.test(requested) ? requested : "/account?from=login";
  const result = await client.auth.signInWithPassword({
    email: text(form, "email").toLowerCase(), password: String(form.get("password") ?? ""),
  });
  if (result.error?.code === "email_not_confirmed") redirect("/register?message=code");
  redirect(result.error ? `/login?message=login&next=${encodeURIComponent(next)}` : next);
}

export async function signUp(form: FormData) {
  const client = await sessionClient(true);
  const origin = process.env.LIVESCHOOL_WEB_ORIGIN;
  if (!client || !origin) redirect("/register?message=unavailable");
  const displayName = text(form, "name");
  const email = text(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const kind = text(form, "kind");
  const phone = text(form, "phone");
  if (displayName.length < 2 || displayName.length > 100 || !validEmail(email) ||
    !validPassword(password) || password !== String(form.get("confirmPassword") ?? "") ||
    (phone && !/^\+?[0-9 ()-]{8,25}$/.test(phone)) || !["student", "parent"].includes(kind))
    redirect("/register?message=invalid");
  const { error } = await client.auth.signUp({
    email, password,
    options: { emailRedirectTo: new URL("/account/callback", origin).toString(), data: { display_name: displayName, account_kind: kind, ...(phone && { contact_phone: phone }) } },
  });
  if (error) {
    console.warn("Signup request failed", { code: error.code, status: error.status });
    redirect(error.status === 429 ? "/register?message=wait" : "/register?message=signup");
  }
  redirect("/register?message=confirm");
}

export async function resendSignupCode(form: FormData) {
  const client = await sessionClient(true);
  const origin = process.env.LIVESCHOOL_WEB_ORIGIN;
  const email = text(form, "email").toLowerCase();
  if (!client || !origin || !validEmail(email)) redirect("/register?message=code-invalid");
  const { error } = await client.auth.resend({
    type: "signup", email,
    options: { emailRedirectTo: new URL("/account/callback", origin).toString() },
  });
  if (error) {
    console.warn("Signup resend failed", { code: error.code, status: error.status });
    redirect(error.status === 429 ? "/register?message=code-wait" : "/register?message=code-failed");
  }
  redirect("/register?message=resent");
}

export async function verifySignupCode(form: FormData) {
  const client = await sessionClient(true);
  const email = text(form, "email").toLowerCase();
  const token = text(form, "code");
  if (!client || !validEmail(email) || !/^\d{6,10}$/.test(token)) redirect("/register?message=code-invalid");
  const { error } = await client.auth.verifyOtp({ email, token, type: "email" });
  redirect(error ? "/register?message=code-invalid" : "/account");
}

function recoveryClient() {
  const config = authConfig();
  return config && createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requestPasswordCode(form: FormData) {
  const client = recoveryClient();
  const email = text(form, "email").toLowerCase();
  if (!client || !validEmail(email)) redirect("/reset-password?message=invalid");
  await client.auth.resetPasswordForEmail(email);
  redirect("/reset-password?step=code");
}

export async function resetPassword(form: FormData) {
  const client = recoveryClient();
  const email = text(form, "email").toLowerCase();
  const token = text(form, "code");
  const password = String(form.get("password") ?? "");
  if (!client || !validEmail(email) || !/^\d{6,10}$/.test(token) ||
    !validPassword(password) || password !== String(form.get("confirmPassword") ?? "")) {
    redirect("/reset-password?step=code&message=invalid");
  }
  const { error } = await client.auth.verifyOtp({ email, token, type: "recovery" });
  if (error) redirect("/reset-password?step=code&message=code");
  const changed = await client.auth.updateUser({ password });
  if (changed.error) redirect("/reset-password?message=failed");
  await client.auth.signOut({ scope: "global" });
  redirect("/login?message=reset");
}

export async function signOut() {
  const client = await sessionClient(true);
  await client?.auth.signOut();
  redirect("/account");
}

async function requireOwner() {
  const account = await getAccount();
  const admin = ownerClient();
  if (!account?.roles.includes("owner") || !admin) redirect("/account?message=denied");
  return admin;
}

export async function addUser(form: FormData) {
  const admin = await requireOwner();
  const role = text(form, "role");
  if (role === "teacher") redirect("/admin/teachers");
  const destination = "/account";
  const name = text(form, "name");
  const email = text(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!managedRoles.has(role) || !validEmail(email) || email === process.env.LIVESCHOOL_OWNER_EMAIL?.toLowerCase() ||
    name.length < 2 || name.length > 100 || password.length < 12 || password.length > 72)
    redirect(`${destination}?message=invalid`);
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { display_name: name },
  });
  if (error || !data.user) redirect(`${destination}?message=add-failed`);
  const assigned = await admin.rpc("assign_created_account_role", { account_id: data.user.id, assigned_role: role });
  if (assigned.error || assigned.data !== true) {
    const cleanup = await admin.auth.admin.deleteUser(data.user.id);
    redirect(`${destination}?message=${cleanup.error ? "cleanup-failed" : "add-failed"}`);
  }
  redirect(`${destination}?message=added`);
}

export async function changeDemoVisibility(form: FormData) {
  const admin = await requireOwner();
  const enabled = text(form, "enabled");
  if (!["true", "false"].includes(enabled) || (enabled === "false" && form.get("confirmed") !== "on"))
    redirect("/account?message=invalid");
  const { error } = await admin.from("site_settings").update({ demo_enabled: enabled === "true" }).eq("id", true);
  redirect(error ? "/account?message=save-failed" : "/account?message=saved");
}

export async function saveSocialLinks(form: FormData) {
  const admin = await requireOwner();
  const links: SocialLinksConfig = {};
  for (const { id, hosts } of socialChannels) {
    const value = text(form, id);
    if (!value) continue;
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      redirect("/admin/settings?social=invalid#social-links");
    }
    if (value.length > 2048 || url.protocol !== "https:" || url.username || url.password || url.port ||
      !hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
      redirect("/admin/settings?social=invalid#social-links");
    }
    links[id] = url.href;
  }
  const { error } = await admin.from("site_settings").update({ social_links: links }).eq("id", true);
  redirect(error ? "/admin/settings?social=failed#social-links" : "/admin/settings?social=saved#social-links");
}

export async function removeUser(form: FormData) {
  const admin = await requireOwner();
  const userId = text(form, "userId");
  if (!/^[0-9a-f-]{36}$/i.test(userId) || form.get("confirmed") !== "on")
    redirect("/account?message=invalid");
  const [roles, target] = await Promise.all([
    admin.from("account_roles").select("role_code").eq("user_id", userId),
    admin.auth.admin.getUserById(userId),
  ]);
  if (roles.error || target.error || !target.data.user ||
    roles.data.some(({ role_code }) => role_code === "owner") ||
    target.data.user.email?.toLowerCase() === process.env.LIVESCHOOL_OWNER_EMAIL?.trim().toLowerCase())
    redirect("/account?message=delete-failed");
  const result = await admin.auth.admin.deleteUser(userId);
  redirect(result.error ? "/account?message=delete-failed" : "/account?message=deleted");
}
