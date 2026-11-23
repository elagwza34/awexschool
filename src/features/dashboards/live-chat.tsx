import { redirect } from "next/navigation";
import { getAccount, sessionClient } from "@/features/auth/supabase-server";
import { ChatWorkspace, type ChatData, type ChatRole } from "./chat-workspace";

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export async function LiveChat({ role, section, searchParams }: {
  role: ChatRole;
  section: "chat" | "admin-chat";
  searchParams: Promise<{ contact?: string; user?: string }>;
}) {
  const [account, client, params] = await Promise.all([getAccount(), sessionClient(), searchParams]);
  if (!client || !account?.roles.some((item) => item === role || (role === "admin" && item === "owner"))) {
    redirect("/account");
  }

  const administration = role === "admin" || section === "admin-chat";
  const path = `/${role}/${section}`;
  const contact = params.contact ?? params.user;
  const { data, error } = await client.rpc("read_direct_chat", {
    p_role: role,
    p_admin: administration,
    p_contact: typeof contact === "string" && uuid.test(contact) ? contact : null,
  });

  return (
    <main id="main-content" className="dashboard-width space-y-4 py-5">
      <h1 className="text-2xl font-bold">
        {administration ? "شات الإدارة" : role === "teacher" ? "شات الطلاب" : "الشات"}
      </h1>
      {error ? (
        <p role="alert" className="soft-card p-5">تعذّر تحميل المحادثات.</p>
      ) : (
        <ChatWorkspace role={role} administration={administration} data={data as ChatData} path={path} accountId={account.user.id} />
      )}
    </main>
  );
}
