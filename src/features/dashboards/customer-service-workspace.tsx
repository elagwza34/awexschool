import { redirect } from "next/navigation";
import { getAccount, sessionClient } from "@/features/auth/supabase-server";
import { StaffWorkspaceView } from "./staff-workspace";
import { escalateCustomerRequest, replyToCustomerRequest, replyToTechnicalRequest, updateCustomerRequest, updateTechnicalRequest } from "./customer-service-actions";
import { readServiceTickets } from "./service-ticket-reads";

const events: Record<string, string> = {
  assigned: "تم إسناد الطلب", reply: "تم إضافة رد", status: "تم تحديث الحالة", escalated: "تم تصعيد الطلب",
};

export async function CustomerServiceWorkspace({ section, technical = false }: {
  section: "overview" | "requests" | "activity";
  technical?: boolean;
}) {
  const account = await getAccount();
  const role = technical ? "support" : "customer_service";
  if (!account?.roles.includes(role)) redirect("/?message=denied");
  const client = await sessionClient();
  const [tickets, activity, managers] = client ? await Promise.all([
    readServiceTickets(client, account.user.id, role),
    section === "activity" ? client.from("support_request_activity")
      .select("request_id,event_type,created_at").order("id", { ascending: false }) : null,
    !technical && section === "requests" ? client.rpc("service_escalation_targets") : null,
  ]) : [null, null, null];
  return <main id="main-content" className="dashboard-width space-y-4 py-5">
    {!tickets || activity?.error || managers?.error
      ? <p role="alert" className="soft-card p-4">تعذّر تحميل الطلبات حاليًا.</p>
      : <StaffWorkspaceView
        role={technical ? "support" : "customer-service"}
        persisted
        section={section}
        members={[]}
        requests={tickets}
        activity={(activity?.data ?? []).filter((row) => tickets.some(({ id }) => id === row.request_id))
          .map((row) => `${row.request_id}: ${events[row.event_type] ?? row.event_type} · ${new Intl.DateTimeFormat("ar-EG", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date(row.created_at))}`)}
        managers={managers?.data ?? []}
        updateRequest={technical ? updateTechnicalRequest : updateCustomerRequest}
        replyToRequest={technical ? replyToTechnicalRequest : replyToCustomerRequest}
        escalateRequest={technical ? undefined : escalateCustomerRequest}
      />}
  </main>;
}
