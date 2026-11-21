"use client";
import { useState } from "react";
import Link from "next/link";
import { Panel, MetricCards } from "./dashboard-panels";
import { TeamManagement } from "./team-management";
import { useStaffPreview } from "./staff-context";
import { Button } from "@/components/ui/button";
import { RequestReplies } from "./request-replies";
import {
  staffRoles,
  staffSections,
  requestStatusLabels,
  type RequestStatus,
} from "./staff-data";
import type { StaffRole } from "./types";
export function StaffWorkspace({
  role,
  section = "overview",
}: {
  role: StaffRole;
  section?: "overview" | "requests" | "team" | "activity";
}) {
  const { members, requests, activity, updateRequest, replyToRequest } = useStaffPreview();
  const [replyFeedback, setReplyFeedback] = useState<{ id: string; error?: string }>();
  const [filter, setFilter] = useState("all"),
    [query, setQuery] = useState("");
  const definition = staffRoles.find((item) => item.id === role)!;
  const visible = requests.filter(
    (item) =>
      (filter === "all" || item.status === filter) &&
      `${item.id} ${item.title} ${item.sender} ${item.contactEmail ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const logs =
    role === "manager"
      ? activity
      : activity.filter((entry) =>
          requests.some((item) => entry.startsWith(`${item.id}:`)),
        );
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">
          {staffSections(role).find((item) => item.id === section)?.label} ·{" "}
          {definition.label}
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {definition.description} نموذج واجهة فقط، بدون صلاحيات أو تواصل فعلي.
        </p>
      </div>
      {section === "overview" && (
        <>
          <MetricCards
            metrics={[
              {
                label: "الطلبات",
                value: String(requests.length),
                note: "بيانات توضيحية",
                icon: "review",
                tone: "blue",
              },
              {
                label: "قيد المتابعة",
                value: String(
                  requests.filter((item) => item.status !== "resolved").length,
                ),
                note: "طلبات لم تُحل بعد",
                icon: "time",
                tone: "peach",
              },
              {
                label: role === "manager" ? "أعضاء الفريق" : "تم الحل",
                value: String(
                  role === "manager"
                    ? members.length
                    : requests.filter((item) => item.status === "resolved")
                        .length,
                ),
                note: "داخل المعاينة",
                icon: "complete",
                tone: "mint",
              },
            ]}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {staffSections(role)
              .filter((item) => item.id !== "overview")
              .map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="soft-card flex min-h-20 items-center p-4 font-bold"
                >
                  {item.label}
                </Link>
              ))}
          </div>
        </>
      )}
      {section === "team" && role === "manager" && <TeamManagement />}
      {section === "requests" && (
        <Panel
          title={
            role === "manager" ? "متابعة طلبات الفريق" : "طلباتك في المعاينة"
          }
          subtitle={
            role === "manager"
              ? "متابعة فقط؛ تحديث الحالة من لوحة الدعم الفني."
              : "حدّث الحالة أو أضف ردًا يظهر لصاحب الطلب في المعاينة."
          }
        >
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="staff-query"
                className="mb-2 block text-sm font-bold"
              >
                البحث في الطلبات
              </label>
              <input
                id="staff-query"
                className="field"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="staff-status"
                className="mb-2 block text-sm font-bold"
              >
                حالة الطلب
              </label>
              <select
                id="staff-status"
                className="field"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="all">الكل</option>
                {Object.entries(requestStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-4">
            {visible.map((item) => (
              <article key={item.id} className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">
                  <bdi>{item.id}</bdi> · {item.sender}
                </p>
                {item.contactEmail && <p className="mt-1 break-all text-xs text-muted-foreground"><bdi>{item.contactEmail}</bdi></p>}
                <h3 className="my-3 font-bold">{item.title}</h3>
                <p className="mb-4 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
                  {item.details}
                </p>
                {role === "manager" ? (
                  <p className="text-sm font-bold">
                    {requestStatusLabels[item.status]}
                  </p>
                ) : (
                  <div>
                    <label
                      htmlFor={`request-${item.id}`}
                      className="mb-2 block text-sm font-bold"
                    >
                      حالة {item.id}
                    </label>
                    <select
                      id={`request-${item.id}`}
                      className="field sm:max-w-xs"
                      value={item.status}
                      onChange={(event) =>
                        updateRequest(
                          role,
                          item.id,
                          event.target.value as RequestStatus,
                        )
                      }
                    >
                      {Object.entries(requestStatusLabels).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                )}
                <RequestReplies replies={item.replies} />
                {role === "support" && (
                  <form className="mt-4 grid gap-2" onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const error = replyToRequest(role, item.id, String(new FormData(form).get("reply") ?? ""));
                    setReplyFeedback({ id: item.id, error });
                    if (!error) form.reset();
                  }}>
                    <label className="grid gap-2 text-sm font-semibold">رد الفريق
                      <textarea className="field min-h-20 py-2" name="reply" required minLength={3} maxLength={2000} />
                    </label>
                    {replyFeedback?.id === item.id && <p role={replyFeedback.error ? "alert" : "status"} className="text-sm">
                      {replyFeedback.error ?? "تم إضافة الرد."}
                    </p>}
                    <Button type="submit" className="justify-self-start">إضافة الرد</Button>
                  </form>
                )}
              </article>
            ))}
          </div>
          {!visible.length && (
            <p role="status" className="py-4 text-center">
              لا توجد طلبات مطابقة.
            </p>
          )}
        </Panel>
      )}
      {section === "activity" && (
        <Panel
          title="سجل النشاط التجريبي"
          subtitle="تغييرات هذه الجلسة فقط؛ يُعاد ضبطها عند تحديث الصفحة."
        >
          {logs.length ? (
            <ul className="space-y-3">
              {logs.map((entry, index) => (
                <li
                  key={`${entry}-${index}`}
                  className="rounded-xl border p-4 text-sm"
                >
                  {entry}
                </li>
              ))}
            </ul>
          ) : (
            <p role="status" className="py-4 text-sm text-muted-foreground">
              لا توجد تغييرات في هذه المعاينة بعد.
            </p>
          )}
        </Panel>
      )}
    </div>
  );
}
