import { redirect } from "next/navigation";
import { getAccount, sessionClient } from "@/features/auth/supabase-server";
import { StaffWorkspaceView } from "./staff-workspace";
import { escalateCustomerRequest, replyToCustomerRequest, updateCustomerRequest } from "./customer-service-actions";
import type { RequestStatus } from "./staff-data";

const events: Record<string, string> = {
  assigned: "تم إسناد الطلب", reply: "تم إضافة رد", status: "تم تحديث الحالة", escalated: "تم تصعيد الطلب",
};

export async function CustomerServiceWorkspace({ section }: { section: "overview" | "requests" | "activity" }) {
  const account = await getAccount();
  if (!account?.roles.includes("customer_service")) redirect("/?message=denied");
  const client = await sessionClient();
  const [tickets, activity, managers] = client ? await Promise.all([
    client.from("support_requests")
      .select("id,title,details,contact_name,contact_email,status,escalated_manager_id,support_replies(body,created_at)")
      .eq("assigned_staff_id", account.user.id).order("created_at", { ascending: false }),
    section === "activity" ? client.from("support_request_activity")
      .select("request_id,event_type,created_at").order("id", { ascending: false }) : null,
    section === "requests" ? client.rpc("service_escalation_targets") : null,
  ]) : [null, null, null];
  return <main id="main-content" className="dashboard-width space-y-4 py-5">
    {!tickets || tickets.error || activity?.error || managers?.error
      ? <p role="alert" className="soft-card p-4">تعذّر تحميل بيانات خدمة العملاء حاليًا.</p>
      : <StaffWorkspaceView
        role="customer-service"
        section={section}
        members={[]}
        requests={(tickets.data ?? []).map((row) => ({
          id: row.id, title: row.title, details: row.details, sender: row.contact_name,
          contactEmail: row.contact_email, status: row.status as RequestStatus, escalated: Boolean(row.escalated_manager_id),
          replies: [...(row.support_replies ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)).map(({ body }) => body),
        }))}
        activity={(activity?.data ?? []).map((row) => `${row.request_id}: ${events[row.event_type] ?? row.event_type} · ${new Intl.DateTimeFormat("ar-EG", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date(row.created_at))}`)}
        managers={managers?.data ?? []}
        updateRequest={updateCustomerRequest}
        replyToRequest={replyToCustomerRequest}
        escalateRequest={escalateCustomerRequest}
      />}
  </main>;
}
