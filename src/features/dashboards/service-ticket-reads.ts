import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestStatus, StaffRequest } from "./staff-data";

export async function readServiceTickets(
  client: SupabaseClient,
  accountId: string,
  scope: "customer_service" | "support" | "manager",
) {
  let query = client.from("support_requests")
    .select("id,title,details,contact_name,contact_email,status,escalated_manager_id,support_replies(body,created_at)")
    .eq(scope === "manager" ? "escalated_manager_id" : "assigned_staff_id", accountId);
  if (scope === "support") query = query.eq("service_category", "technical");
  if (scope === "customer_service") query = query.in("service_category", ["general", "registration", "enrollment", "complaint"]);
  const result = await query.order("created_at", { ascending: false });
  if (result.error) return null;
  return (result.data ?? []).map((row): StaffRequest => ({
    id: row.id, title: row.title, details: row.details, sender: row.contact_name,
    contactEmail: row.contact_email, status: row.status as RequestStatus, escalated: Boolean(row.escalated_manager_id),
    replies: [...(row.support_replies ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)).map(({ body }) => body),
  }));
}
