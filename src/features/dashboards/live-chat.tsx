import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
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

  // تحديد سبب الخطأ بدقة
  let errorMessage = "تعذّر تحميل المحادثات.";
  let errorDetails = "";
  if (error) {
    errorDetails = String(error.message || error);
    if (errorDetails.includes("permission")) {
      errorMessage = "لا يمكنك الوصول للمحادثات. تأكد من أن لديك محادثات مشتركة.";
    } else if (errorDetails.includes("network") || errorDetails.includes("fetch")) {
      errorMessage = "تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.";
    } else if (errorDetails.includes("auth")) {
      errorMessage = "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.";
    }
  }

  return (
    <main id="main-content" className="dashboard-width space-y-4 py-5">
      <h1 className="text-2xl font-bold">
        {administration ? "شات الإدارة" : role === "teacher" ? "شات الطلاب" : "الشات"}
      </h1>
      {error ? (
        <section className="soft-card p-6 flex flex-col items-center justify-center text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold mb-2">{errorMessage}</h2>
          {errorDetails && (
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              {errorDetails}
            </p>
          )}
          <Button onClick={() => window.location.reload()}>
            إعادة المحاولة
          </Button>
        </section>
      ) : (
        <ChatWorkspace role={role} administration={administration} data={data as ChatData} path={path} accountId={account.user.id} />
      )}
    </main>
  );
}
