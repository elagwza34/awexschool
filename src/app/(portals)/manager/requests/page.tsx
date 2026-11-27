import { redirect } from "next/navigation";
import { getAccount, sessionClient } from "@/features/auth/supabase-server";
import { StaffWorkspaceView } from "@/features/dashboards/staff-workspace";
import { readServiceTickets } from "@/features/dashboards/service-ticket-reads";

export default async function ManagerRequestsPage() {
  const account = await getAccount();
  if (!account?.roles.includes("manager")) redirect("/?message=denied");
  const client = await sessionClient();
  const requests = client ? await readServiceTickets(client, account.user.id, "manager") : null;
  return <main id="main-content" className="dashboard-width py-5">
    {requests ? <StaffWorkspaceView role="manager" section="requests" persisted requests={requests} activity={[]} members={[]} />
      : <p role="alert" className="soft-card p-4">تعذّر تحميل الطلبات المصعّدة حاليًا.</p>}
  </main>;
}
