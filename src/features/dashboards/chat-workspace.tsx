"use client";
import { portalCourseHref } from "@/features/content/routes";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  MessageCircle,
  Search,
  Send,
} from "lucide-react";
import { Badge, tones } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { getGrade, getSubject, getTeacher } from "@/features/catalog/mock-data";
import { normalizeArabic } from "@/features/catalog/service";
import { cn } from "@/lib/utils";
import { getDashboardProfile } from "./mock-data";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import { studentFixtures } from "@/features/enrollments/data";
import { adminThreadsForRole } from "./admin-chat-data";
import { previewStudentId, previewTeacherId, type ChatRole } from "./chat-data";
import { usePortalPreview } from "./preview-context";

export function ChatWorkspace({
  role,
  administration = false,
}: {
  role: ChatRole;
  administration?: boolean;
}) {
  const { chatMessages, sendChatMessage, studentProfile, teacherProfile } =
    usePortalPreview();
  const { threadsForRole, accounts, resolveCourse } = useEnrollmentPreview();
  const threads = threadsForRole(role);
  const adminThreads = adminThreadsForRole(role);
  const [selectedId, setSelectedId] = useState(
    (administration ? adminThreads : threads)[0]?.id ?? "",
  );
  const [roleFilter, setRoleFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const contacts = administration
    ? adminThreads.map((thread) => ({
        ...thread,
        name:
          role === "admin"
            ? thread.userId === previewTeacherId
              ? teacherProfile.displayName
              : thread.userId === previewStudentId
                ? studentProfile.displayName
                : thread.name
            : getDashboardProfile("admin").name,
        description: role === "admin" ? thread.description : "إدارة المنصة",
      }))
    : threads.map((thread) => {
        const teacher = getTeacher(thread.teacherId)!;
        const account = accounts.find(
          (item) =>
            item.kind === "student" && item.entityId === thread.studentId,
        )!;
        const student = {
          name: account.name,
          grade:
            getGrade(
              studentFixtures.find((item) => item.id === thread.studentId)!
                .gradeId,
            )?.name ?? "",
        };
        const name =
          role === "student"
            ? thread.teacherId === previewTeacherId
              ? teacherProfile.displayName
              : `أ. ${teacher.name}`
            : thread.studentId === previewStudentId
              ? studentProfile.displayName
              : student.name;
        const courseLabels = thread.courseIds
          .map((id) => getSubject(resolveCourse(id)!.subjectId)!.name)
          .join("، ");
        return {
          ...thread,
          name,
          description:
            role === "student"
              ? courseLabels
              : thread.studentId === previewStudentId
                ? (getGrade(studentProfile.gradeId)?.name ?? student.grade)
                : student.grade,
          courseLabels,
          tone: teacher.tone,
        };
      });
  const filteredContacts = contacts.filter(
    (contact) =>
      (roleFilter === "all" ||
        !administration ||
        adminThreads.find((thread) => thread.id === contact.id)?.role ===
          roleFilter) &&
      normalizeArabic(
        `${contact.name} ${contact.description} ${contact.courseLabels}`,
      ).includes(normalizeArabic(query)),
  );
  const selected = contacts.find(
    (contact) =>
      contact.id === selectedId &&
      (!administration ||
        roleFilter === "all" ||
        adminThreads.find((thread) => thread.id === contact.id)?.role ===
          roleFilter),
  );
  const messages = selected
    ? chatMessages.filter((message) => message.threadId === selected.id)
    : [];
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [selectedId, messages.length, mobileOpen]);
  const send = () => {
    if (!selected) return;
    const result = sendChatMessage(role, selected.id, draft);
    if (!result.ok) {
      setError(result.error ?? "تعذّر إضافة الرسالة للمعاينة.");
      return;
    }
    setDraft("");
    setError("");
    setStatus("اتضافت الرسالة للمعاينة فقط. لم تُرسل إلى شخص حقيقي.");
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
        <Badge className="bg-white text-muted-foreground">
          محادثات محلية تجريبية · بدون إرسال حقيقي
        </Badge>
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
                  onChange={(event) => {
                    setRoleFilter(event.target.value);
                    setSelectedId("");
                    setDraft("");
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
              {contacts.length} جهات اتصال مرتبطة في المعاينة
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
            {filteredContacts.map((contact) => {
              const latest = chatMessages
                .filter((message) => message.threadId === contact.id)
                .at(-1);
              return (
                <li key={contact.id}>
                  <button
                    type="button"
                    aria-pressed={selectedId === contact.id}
                    onClick={() => {
                      setSelectedId(contact.id);
                      setDraft("");
                      setError("");
                      setStatus("");
                      setMobileOpen(true);
                    }}
                    className={cn(
                      "flex min-h-20 w-full items-start gap-3 rounded-xl border p-3 text-start transition-colors",
                      selectedId === contact.id
                        ? "border-input bg-secondary"
                        : "border-transparent hover:bg-muted",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        tones[contact.tone],
                      )}
                    >
                      {contact.name
                        .replace(/^أ\.\s*/, "")
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join(" ")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">
                        {contact.name}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {contact.description}
                      </span>
                      <span className="mt-2 block truncate text-xs text-muted-foreground">
                        {latest?.text ??
                          (administration
                            ? "ابدأ محادثة"
                            : "ابدأ محادثة عن المقرر")}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
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
          className={cn(
            "min-w-0 flex-col",
            mobileOpen && selected ? "flex" : "hidden md:flex",
          )}
        >
          {selected ? (
            <>
              <header className="flex min-h-16 items-center justify-between gap-3 border-b px-4 py-3 sm:px-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="رجوع للمحادثات"
                    className="md:hidden"
                    onClick={() => setMobileOpen(false)}
                  >
                    <ArrowRight aria-hidden="true" />
                  </Button>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold">{selected.name}</h2>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {selected.courseLabels} · محادثة تجريبية
                    </p>
                  </div>
                </div>
                {selected.courseIds.length > 0 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={portalCourseHref(role, selected.courseIds[0])}>
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
                    ? "تواصل مع الإدارة · الرسائل هنا أمثلة ومحاكاة محلية فقط"
                    : "مساحة للأسئلة الدراسية · الرسائل هنا أمثلة ومحاكاة محلية فقط"}
                </p>
                {messages.length ? (
                  <ol className="space-y-4">
                    {messages.map((message) => {
                      const mine = message.sender === role;
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
                              {mine ? "أنت" : selected.name}
                            </p>
                            <p className="whitespace-pre-wrap break-words text-sm leading-7 [overflow-wrap:anywhere]">
                              {message.text}
                            </p>
                            <time
                              dateTime={message.sentAt}
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
                              }).format(new Date(message.sentAt))}{" "}
                              · معاينة
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
                      if (draft.trim()) formRef.current?.requestSubmit();
                    }
                  }}
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[10px] text-muted-foreground">
                    <bdi>Enter</bdi> للإضافة · <bdi>Shift + Enter</bdi> لسطر
                    جديد · {draft.length}/٢٠٠٠
                  </p>
                  <Button type="submit" disabled={!draft.trim()}>
                    <Send aria-hidden="true" className="rtl:rotate-180" />
                    إرسال في المعاينة
                  </Button>
                </div>
                {error && (
                  <p role="alert" className="mt-3 text-xs text-destructive">
                    {error}
                  </p>
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
      <p className="border-t px-4 py-3 text-[11px] leading-7 text-muted-foreground">
        لا تستخدم بيانات حقيقية. الرسائل مؤقتة وتُحذف بتحديث الصفحة أو مغادرة
        المعاينة. لا توجد تنبيهات أو إيصالات قراءة فعلية.
      </p>
    </section>
  );
}
