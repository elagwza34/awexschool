"use client";
import { TeacherAvatar } from "@/components/teacher-avatar";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  MessageCircle,
  Search,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeArabic } from "@/features/catalog/service";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import {
  ChatAttachment,
  ChatAttachmentField,
  chatAttachmentBucket,
  chatAttachmentContentType,
  type StoredChatFile,
} from "@/features/chat/attachment";
import { sendPortalMessage } from "./live-chat-actions";

export type ChatRole = "admin" | "student" | "teacher" | "parent";

type ChatContact = {
  id: string;
  name: string;
  role: ChatRole;
  description: string;
  course_labels: string;
  course_ids: string[];
  latest: string | null;
  unreadCount: number;
};

export type ChatData = {
  contacts: ChatContact[];
  selectedId: string | null;
  messages: {
    id: string;
    body: string;
    created_at: string;
    mine: boolean;
    from_admin: boolean;
    attachment: StoredChatFile | null;
  }[];
};

export function ChatWorkspace({
  role,
  administration,
  data,
  path,
  accountId,
}: {
  role: ChatRole;
  administration: boolean;
  data: ChatData;
  path: string;
  accountId: string;
}) {
  const router = useRouter();
  const { contacts, selectedId, messages } = data;
  const [roleFilter, setRoleFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<File>();
  const [recording, setRecording] = useState(false);
  const [contactCleared, setContactCleared] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [failedMessage, setFailedMessage] = useState<{ draft: string; attachment: File | undefined } | null>(null);
  const [changingContact, changeContact] = useTransition();
  const [sending, sendMessage] = useTransition();
  const canSend = !changingContact && !sending && !recording && Boolean(draft.trim() || attachment);
  const logRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const matchesRole = (contact: ChatContact) => roleFilter === "all" || contact.role === roleFilter;
  const filteredContacts = contacts.filter((contact) =>
    matchesRole(contact) && normalizeArabic(
      `${contact.name} ${contact.description} ${contact.course_labels}`,
    ).includes(normalizeArabic(query)),
  );
  const selected = contactCleared ? undefined : contacts.find((contact) => contact.id === selectedId && matchesRole(contact));

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [selectedId, messages.length, mobileOpen]);
  const send = () => {
    if (!selected || !canSend) return;
    sendMessage(async () => {
      setError("");
      setStatus("");
      const storage = attachment ? createClient().storage.from(chatAttachmentBucket) : null;
      const key = storage ? `${accountId}/${crypto.randomUUID()}` : null;
      try {
        if (storage && key && attachment) {
          const contentType = chatAttachmentContentType(attachment.type);
          const { error } = await storage.upload(key, attachment.slice(0, attachment.size, contentType), { contentType });
          if (error) throw error;
        }
        const result = await sendPortalMessage(
          role, administration, selected.id, draft,
          key && attachment ? { key, name: attachment.name } : null,
        );
        if (!result.ok) throw new Error("Message rejected");
      } catch {
        if (storage && key) void storage.remove([key]).catch(() => {});
        setFailedMessage({ draft, attachment });
        setError("تعذّر إرسال الرسالة. يمكنك إعادة المحاولة.");
        return;
      }
      setDraft("");
      setAttachment(undefined);
      setFailedMessage(null);
      setStatus("تم إرسال الرسالة.");
      router.refresh();
    });
  };
  return (
    <section
      className="soft-card min-w-0 overflow-hidden"
      aria-label={administration ? "شات الإدارة" : "شات الطالب والمدرس"}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-secondary/40 px-4 py-3">
        <p className="text-xs font-semibold text-primary">
          {administration
            ? "تواصل الإدارة مع مستخدمي المنصة"
            : role === "student"
              ? "تواصل مع المدرسين المرتبطين بمقرراتك فقط"
              : "محادثات الطلاب المرتبطين بمقرراتك فقط"}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)]">
        <div
          className={cn(
            "min-w-0 flex-col border-e bg-muted/20",
            mobileOpen && selected ? "hidden md:flex" : "flex",
          )}
        >
          <div className="border-b p-4">
            {administration && role === "admin" && (
              <div className="mb-4">
                <label
                  htmlFor="admin-chat-role"
                  className="mb-2 block text-xs font-bold"
                >
                  نوع المستخدم
                </label>
                <select
                  id="admin-chat-role"
                  className="field"
                  value={roleFilter}
                  disabled={sending || changingContact}
                  onChange={(event) => {
                    setRoleFilter(event.target.value);
                    setContactCleared(true);
                    setDraft("");
                    setAttachment(undefined);
                    setRecording(false);
                    setError("");
                    setStatus("");
                    setMobileOpen(false);
                  }}
                >
                  <option value="all">الكل</option>
                  <option value="teacher">المدرسون</option>
                  <option value="student">الطلاب</option>
                  <option value="parent">أولياء الأمور</option>
                </select>
              </div>
            )}
            <h2 className="mb-1 font-semibold">
              {administration
                ? "المحادثات"
                : role === "student"
                  ? "مدرسوني"
                  : "طلابي"}
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              {contacts.length} جهات اتصال
            </p>
            <label
              htmlFor="chat-contact-search"
              className="mb-2 flex items-center gap-2 text-xs font-bold"
            >
              <Search aria-hidden="true" className="size-3.5" />
              البحث في المحادثات
            </label>
            <input
              id="chat-contact-search"
              type="search"
              className="field text-sm"
              maxLength={100}
              placeholder={
                administration
                  ? "اسم المستخدم..."
                  : role === "student"
                    ? "اسم المدرس أو المادة..."
                    : "اسم الطالب أو المقرر..."
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ul
            aria-label={
              administration
                ? "قائمة محادثات الإدارة"
                : role === "student"
                  ? "قائمة المدرسين المرتبطين"
                  : "قائمة الطلاب المرتبطين"
            }
            className="max-h-[580px] space-y-1 overflow-y-auto p-2"
          >
            {filteredContacts.map((contact) => (
                <li key={contact.id}>
                  <button
                    type="button"
                    aria-pressed={selected?.id === contact.id}
                    disabled={sending || changingContact}
                    onClick={() => {
                      if (contact.id !== selectedId) {
                        setDraft("");
                        setAttachment(undefined);
                        setRecording(false);
                        setError("");
                        setStatus("");
                        changeContact(() => router.replace(`${path}?contact=${contact.id}`, { scroll: false }));
                      }
                      setContactCleared(false);
                      setMobileOpen(true);
                    }}
                    className={cn(
                      "flex min-h-20 w-full items-start gap-3 rounded-xl border p-3 text-start transition-colors",
                      selectedId === contact.id
                        ? "border-input bg-secondary"
                        : "border-transparent hover:bg-muted",
                    )}
                  >
                    <TeacherAvatar
                      className="size-11"
                      fallback={contact.name
                        .replace(/^أ\.\s*/, "")
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join(" ")}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">
                        {contact.name}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {contact.description}
                      </span>
                      <span className="mt-2 block truncate text-xs text-muted-foreground">
                        {contact.latest ??
                          (administration
                            ? "ابدأ محادثة"
                            : "ابدأ محادثة عن المقرر")}
                      </span>
                      {contact.unreadCount > 0 && (
                        <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">
                          {contact.unreadCount} جديد
                        </span>
                      )}
                    </span>
                  </button>
                </li>
            ))}
          </ul>
          {!filteredContacts.length && (
            <p
              role="status"
              className="p-4 text-center text-sm text-muted-foreground"
            >
              لا توجد جهات اتصال مطابقة.
            </p>
          )}
        </div>
        <div
          aria-busy={changingContact}
          className={cn(
            "min-w-0 flex-col",
            mobileOpen && selected ? "flex" : "hidden md:flex",
          )}
        >
          {changingContact ? (
            <div className="p-7 flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-24 rounded-full bg-secondary/50 animate-pulse" />
              <div className="h-8 w-48 rounded-full bg-secondary/50 animate-pulse" style={{ animationDelay: "200ms" }} />
              <p className="text-xs text-muted-foreground">جارٍ تحميل المحادثة…</p>
            </div>
          ) : selected ? (
            <>
              <header className="flex min-h-16 items-center justify-between gap-3 border-b px-4 py-3 sm:px-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="رجوع للمحادثات"
                    className="md:hidden"
                    onClick={() => { setMobileOpen(false); setRecording(false); }}
                  >
                    <ArrowRight aria-hidden="true" />
                  </Button>
                  <TeacherAvatar className="size-8" />
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold">{selected.name}</h2>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {selected.course_labels || selected.description}
                    </p>
                  </div>
                </div>
                {selected.course_ids.length > 0 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/courses/${selected.course_ids[0]}`}>
                      <BookOpen aria-hidden="true" />
                      <span className="hidden sm:inline">المقرر</span>
                      <span className="sr-only sm:hidden">عرض المقرر</span>
                    </Link>
                  </Button>
                )}
              </header>
              <div
                ref={logRef}
                role="log"
                aria-label={`رسائل المحادثة مع ${selected.name}`}
                aria-live="polite"
                aria-relevant="additions"
                tabIndex={0}
                className="h-[390px] overflow-y-auto bg-[#f6f8f2] p-4 sm:h-[430px] sm:p-4"
              >
                <p className="mb-4 text-center text-[11px] text-muted-foreground">
                  {administration
                    ? "تواصل مع الإدارة"
                    : "مساحة للأسئلة الدراسية"}
                </p>
                {messages.length ? (
                  <ol className="space-y-4">
                    {messages.map((message) => {
                      const mine = message.mine;
                      return (
                        <li
                          key={message.id}
                          className={cn(
                            "flex",
                            mine ? "justify-start" : "justify-end",
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[88%] rounded-2xl border px-4 py-3 sm:max-w-[78%]",
                              mine
                                ? "border-primary bg-primary text-white"
                                : "bg-white text-foreground",
                            )}
                          >
                            <p
                              className={cn(
                                "mb-1 text-[10px] font-bold",
                                mine ? "text-white/90" : "text-primary",
                              )}
                            >
                              {mine ? "أنت" : message.from_admin ? "الإدارة" : selected.name}
                            </p>
                            <p className="whitespace-pre-wrap break-words text-sm leading-7 [overflow-wrap:anywhere]">
                              {message.body}
                            </p>
                            {message.attachment && <ChatAttachment stored={message.attachment} />}
                            <time
                              dateTime={message.created_at}
                              className={cn(
                                "mt-2 block text-[10px]",
                                mine
                                  ? "text-white/90"
                                  : "text-muted-foreground",
                              )}
                            >
                              {new Intl.DateTimeFormat("ar-EG", {
                                hour: "numeric",
                                minute: "2-digit",
                                timeZone: "Africa/Cairo",
                              }).format(new Date(message.created_at))}
                            </time>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <div className="flex h-60 flex-col items-center justify-center text-center">
                    <MessageCircle
                      aria-hidden="true"
                      className="mb-4 size-9 text-primary"
                    />
                    <h3 className="font-bold">
                      {administration
                        ? role === "admin"
                          ? "ابدأ محادثة"
                          : "ابدأ محادثة مع الإدارة"
                        : "ابدأ بسؤال عن المقرر"}
                    </h3>
                    <p className="mt-2 text-xs leading-7 text-muted-foreground">
                      {administration
                        ? "اكتب رسالتك لمتابعة شؤون المنصة."
                        : "اذكر اسم الدرس والفكرة اللي محتاج توضيحها."}
                    </p>
                  </div>
                )}
              </div>
              <form
                ref={formRef}
                className="border-t bg-white p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  send();
                }}
              >
                <label
                  htmlFor="chat-message"
                  className="mb-2 block text-xs font-bold"
                >
                  رسالتك
                </label>
                <textarea
                  id="chat-message"
                  className="field min-h-16 max-h-40 resize-y py-3 text-sm"
                  value={draft}
                  disabled={sending || changingContact}
                  maxLength={2000}
                  placeholder={
                    administration ? "اكتب رسالتك..." : "اكتب سؤالًا عن الدرس..."
                  }
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setError("");
                    setStatus("");
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      if (canSend) formRef.current?.requestSubmit();
                    }
                  }}
                />
                <fieldset disabled={sending}>
                  <ChatAttachmentField key={`${selected.id}:${mobileOpen}`} file={attachment} onFile={setAttachment} onBusy={setRecording} />
                </fieldset>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[10px] text-muted-foreground">
                    <bdi>Enter</bdi> للإرسال · <bdi>Shift + Enter</bdi> لسطر
                    جديد · {draft.length}/٢٠٠٠
                  </p>
                  <Button type="submit" disabled={!canSend}>
                    <Send aria-hidden="true" className="rtl:rotate-180" />
                    {sending ? "جارٍ الإرسال…" : "إرسال"}
                  </Button>
                </div>
                {error && (
                  <div className="mt-3 flex items-center gap-2">
                    <p role="alert" className="text-xs text-destructive flex-1">
                      {error}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (failedMessage) {
                          setDraft(failedMessage.draft);
                          setAttachment(failedMessage.attachment);
                          setFailedMessage(null);
                          setError("");
                          setStatus("");
                        }
                      }}
                    >
                      إعادة المحاولة
                    </Button>
                  </div>
                )}
                {status && (
                  <p role="status" className="mt-3 text-xs text-primary">
                    {status}
                  </p>
                )}
              </form>
            </>
          ) : (
            <p className="p-7 text-center text-sm text-muted-foreground">
              اختار محادثة لعرض الرسائل.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
