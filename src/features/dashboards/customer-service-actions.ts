"use server";

import { revalidatePath } from "next/cache";
import { getAccount, sessionClient } from "@/features/auth/supabase-server";
import type { RequestStatus } from "./staff-data";

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const failure = "تعذّر حفظ التحديث. راجع صلاحية الطلب وحالته.";

async function mutate(id: string, action: string, value: string | null, manager: string | null = null) {
  const account = await getAccount();
  if (!account?.roles.includes("customer_service") || !uuid.test(id)) return failure;
  const client = await sessionClient(true);
  if (!client) return failure;
  const result = await client.rpc("update_assigned_service_request", {
    p_request: id, p_action: action, p_value: value, p_manager: manager,
  });
  if (result.error || result.data !== true) return failure;
  revalidatePath("/customer-service");
  revalidatePath("/customer-service/requests");
  revalidatePath("/customer-service/activity");
}

export async function updateCustomerRequest(id: string, status: RequestStatus) {
  if (status !== "in-progress" && status !== "resolved") return failure;
  return mutate(id, "status", status);
}

export async function replyToCustomerRequest(id: string, body: string) {
  if (typeof body !== "string" || body.trim().length < 3 || body.length > 2000) return failure;
  return mutate(id, "reply", body.trim());
}

export async function escalateCustomerRequest(id: string, manager: string) {
  if (!uuid.test(manager)) return failure;
  return mutate(id, "escalate", null, manager);
}
