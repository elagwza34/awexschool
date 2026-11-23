import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthSubmit } from "@/features/auth/form-controls";
import { Button } from "@/components/ui/button";
import { getAccount, sessionClient } from "@/features/auth/supabase-server";
import { sendPortalMessage, createChatThread } from "./live-chat-actions";

type Role = "admin" | "teacher" | "student" | "parent";

export async function LiveChat({ role, section, searchParams }: {
  role: Role; section: "chat" | "admin-chat"; searchParams: Promise<{ thread?: string; message?: string }>;
}) {
  const [account, client, { thread, message }] = await Promise.all([getAccount(), sessionClient(), searchParams]);
  if (!client || !account?.roles.some((item) => item === role || (role === "admin" && item === "owner"))) redirect("/account");

  const path = `/${role}/${section}`;
  let query = client.from("chat_threads").select("id,group_id,created_at").order("created_at", { ascending: false }).limit(50);
  if (section === "admin-chat") query = query.is("group_id", null);
  else if (role !== "admin") query = query.not("group_id", "is", null);
  const { data: threads, error } = await query;
  const selected = threads?.find((item) => item.id === thread) ?? threads?.[0];
  const messages = selected ? await client.from("chat_messages").select("id,body,sender_id,created_at")
    .eq("thread_id", selected.id).order("created_at", { ascending: false }).limit(50) : null;
  const date = new Intl.DateTimeFormat("ar-EG", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Cairo" });

  return <main id="main-content" className="dashboard-width space-y-4 py-5">
    <h1 className="text-2xl font-bold">{section === "admin-chat" ? "شات الإدارة" : "المحادثات"}</h1>
    {error ? <p role="alert" className="soft-card p-5">تعذّر تحميل المحادثات.</p> : !selected ? (
      <div className="soft-card p-5">
        <p className="text-sm text-muted-foreground mb-3">لسه مفيش محادثات متاحة لحسابك.</p>
        <form action={createChatThread.bind(null, path)} className="flex gap-2">
          <Button type="submit">بدء محادثة جديدة</Button>
        </form>
      </div>
    ) : <div className="grid items-start gap-4 md:grid-cols-[16rem_1fr]">
      <form action={createChatThread.bind(null, path)} className="soft-card p-3 flex gap-2">
        <Button type="submit">محادثة جديدة</Button>
      </form>
      <nav aria-label="المحادثات" className="soft-card grid gap-1 p-3">
        {threads?.map((item, index) => <Link key={item.id} aria-current={item.id === selected.id ? "page" : undefined}
          className="flex min-h-11 items-center rounded-lg px-3 hover:bg-accent aria-[current=page]:bg-accent"
          href={`${path}?thread=${item.id}`}>محادثة {index + 1}</Link>)}
      </nav>
      <section className="soft-card grid gap-4 p-4">
        {(messages?.error || message) && <p role="alert" className="text-sm text-destructive">تعذّر تحميل الرسالة أو إرسالها.</p>}
        <ol className="grid gap-3">
          {[...(messages?.data ?? [])].reverse().map((item) => <li key={item.id} className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">{item.sender_id === account.user.id ? "أنت" : "مشارك"} · {date.format(new Date(item.created_at))}</p>
            <p className="mt-1 whitespace-pre-line break-words">{item.body}</p>
          </li>)}
        </ol>
        <form action={sendPortalMessage.bind(null, path, selected.id)} className="grid gap-3">
          <label className="grid gap-2 text-sm font-semibold">رسالتك<textarea name="body" className="field min-h-24 py-2" maxLength={2000} required /></label>
          <AuthSubmit>إرسال الرسالة</AuthSubmit>
        </form>
      </section>
    </div>}
  </main>;
}
