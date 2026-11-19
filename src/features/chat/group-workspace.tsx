"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePortalPreview } from "@/features/dashboards/preview-context";
import { previewStudentId, previewTeacherId } from "@/features/dashboards/chat-data";
import type { DashboardRole } from "@/features/dashboards/types";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import type { LearningGroup } from "@/features/enrollments/data";
import { ChatAttachment, ChatAttachmentField } from "./attachment";
import { canMonitorGroupChat, groupChatHref, isGroupChatMember } from "./groups";

const timeFormat = new Intl.DateTimeFormat("ar-EG", { timeStyle: "short", timeZone: "Africa/Cairo" });

export function GroupChatWorkspace({ role, groupId }: { role: DashboardRole; groupId?: string }) {
  const { groups, assignments, isEntityActive, staffMembers } = useEnrollmentPreview();
  const monitor = canMonitorGroupChat(role);
  const authorized = monitor
    ? role === "admin" ? isEntityActive("admin", "preview-admin") : staffMembers.some((member) => member.role === role)
    : role === "teacher" ? isEntityActive(role, previewTeacherId)
      : role === "student" && isEntityActive(role, previewStudentId);
  const visible = authorized ? groups.filter((group) => monitor || isGroupChatMember(role, group, assignments)) : [];
  const selected = visible.find(({ id }) => id === groupId);
  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">{monitor ? "مراقبة شات المجموعات" : "شات المجموعات"}</h1>
        <p className="text-sm leading-7 text-muted-foreground">
          {monitor ? "عرض رسائل المجموعات ومرفقاتها للمراقبة." : "الرسائل متاحة لأعضاء المجموعة والمدرس المسند. فريق الإدارة يطّلع عليها للمراقبة."} المعاينة مؤقتة داخل المتصفح.
        </p>
      </header>
      {groupId && !selected && (
        <p role="status" className="soft-card p-4 text-sm">المجموعة دي مش متاحة للدور الحالي.</p>
      )}
      <div className="grid min-w-0 items-start gap-4 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <nav aria-label="المجموعات المتاحة" className="soft-card p-3">
          {visible.length ? (
            <ul className="grid gap-1">
              {visible.map((group) => (
                <li key={group.id}>
                  <Link href={groupChatHref(role, group.id)} aria-current={groupId === group.id ? "page" : undefined}
                    className="flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-semibold hover:bg-secondary aria-[current=page]:bg-secondary">
                    {group.name}{!group.active && " · غير نشطة"}
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="p-2 text-sm text-muted-foreground">مفيش مجموعات متاحة.</p>}
        </nav>
        {selected ? <GroupConversation key={selected.id} group={selected} role={role} /> : (
          <p className="soft-card p-5 text-sm text-muted-foreground">اختار مجموعة لعرض الشات.</p>
        )}
      </div>
    </div>
  );
}

function GroupConversation({ group, role }: { group: LearningGroup; role: DashboardRole }) {
  const { groupMessages, sendGroupMessage } = usePortalPreview();
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const messages = groupMessages.filter((message) => message.threadId === group.id);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages.length]);
  return (
    <section className="soft-card min-w-0 overflow-hidden">
      <header className="border-b px-4 py-3"><h2 className="font-bold">{group.name}</h2></header>
      <div role="log" aria-label={`رسائل مجموعة ${group.name}`} tabIndex={0} ref={log}
        className="h-[22rem] overflow-y-auto bg-secondary/40 p-4">
        {messages.length ? (
          <ol className="grid gap-3">
            {messages.map((message) => (
              <li key={message.id} className="w-fit min-w-0 max-w-full rounded-lg border bg-white p-3">
                <p className="text-xs font-bold text-primary">{message.senderName}</p>
                {message.text && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{message.text}</p>}
                {message.attachment && <ChatAttachment file={message.attachment} />}
                <time dateTime={message.sentAt} className="mt-2 block text-xs text-muted-foreground">{timeFormat.format(new Date(message.sentAt))}</time>
              </li>
            ))}
          </ol>
        ) : <p className="text-sm text-muted-foreground">مفيش رسائل في المجموعة لسه.</p>}
      </div>
      {(role === "student" || role === "teacher") && (
        <form className="grid gap-2 border-t p-4" onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          const result = sendGroupMessage(role, group.id, text, attachment);
          if (!result.ok) { setError(result.error ?? "تعذّر إرسال الرسالة."); return; }
          setText("");
          setAttachment(undefined);
          setError("");
        }}>
          <label className="grid gap-2 text-sm font-semibold">رسالتك
            <textarea className="field min-h-20 resize-y py-2" value={text} maxLength={2000}
              onChange={(event) => { setText(event.target.value); setError(""); }} />
          </label>
          <ChatAttachmentField file={attachment} onFile={setAttachment} onBusy={setBusy} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="justify-self-start" disabled={busy || (!text.trim() && !attachment)}>إرسال في المعاينة</Button>
        </form>
      )}
    </section>
  );
}
