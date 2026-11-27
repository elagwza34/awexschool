"use server";

import { redirect } from "next/navigation";
import { getAccount, sessionClient } from "./supabase-server";

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const staffRoles = ["admin", "manager", "support", "customer_service"];
const statuses = ["pending", "active", "disabled"];
const categories = ["general", "registration", "enrollment", "complaint", "technical"];

async function requireOwnerSession() {
  if (!(await getAccount())?.roles.includes("owner")) redirect("/?message=denied");
  return sessionClient(true);
}

export async function updateManagedAccount(form: FormData) {
  const client = await requireOwnerSession();
  const account = String(form.get("account") ?? "");
  const kind = String(form.get("kind") ?? "");
  const expected = String(form.get("expected") ?? "");
  const value = String(form.get("value") ?? "");
  const validStatus = kind === "status" && statuses.includes(expected) && (value === "active" || value === "disabled");
  const validRole = kind === "staff_role" && staffRoles.includes(expected) && staffRoles.includes(value);
  if (!client || !uuid.test(account) || expected === value || (!validStatus && !validRole)) redirect("/owner?accountUpdate=failed#owner-accounts");
  const result = await client.rpc("owner_change_managed_account", {
    p_account: account, p_kind: kind, p_expected: expected, p_value: value,
  });
  redirect(result.data === true && !result.error ? "/owner?accountUpdate=saved#owner-accounts" : "/owner?accountUpdate=failed#owner-accounts");
}

export async function assignOwnerServiceTicket(form: FormData) {
  const client = await requireOwnerSession();
  const request = String(form.get("request") ?? "");
  const category = String(form.get("category") ?? "");
  const staff = String(form.get("staff") ?? "");
  if (!client || !uuid.test(request) || !uuid.test(staff) || !categories.includes(category)) redirect("/owner?assignment=failed#owner-tickets");
  const result = await client.rpc("assign_service_request", { p_request: request, p_category: category, p_staff: staff });
  redirect(result.data === true && !result.error ? "/owner?assignment=saved#owner-tickets" : "/owner?assignment=failed#owner-tickets");
}
