"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/dashboards/permissions-context";
import type { DashboardRole } from "@/features/dashboards/types";
import { useEnrollmentPreview } from "./context";
import { formatGroupFee } from "./registration";
import { GroupEditor } from "./workspace";

export function GroupRequestsWorkspace({ role }: { role: DashboardRole }) {
  const { groups, accounts, joinRequests, decideJoinRequest, isEntityActive } = useEnrollmentPreview();
  const { can } = usePermissions();
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean }>();
  const [filter, setFilter] = useState("all");
  const admin = role === "admin";
  const canApprove = admin && can(role, "groups:approve") && isEntityActive("admin", "preview-admin");
  const statuses = { paid: "بانتظار موافقة الإدارة", approved: "عضوية مفعّلة", rejected: "مرفوض" } as const;
  const visible = joinRequests.filter((request) => request.status !== "reserved" && (filter === "all" || request.status === filter));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{admin ? "طلبات انضمام المجموعات" : "إدارة المجموعات"}</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{admin ? "راجع الطلب بعد تسجيل الدفع التجريبي. الموافقة تضيف الطالب للمجموعة وتظهر لولي أمره المرتبط." : "أنشئ مجموعة أو عدّل سعتها وسعرها وموعدها."}</p>
        </div>
        <GroupEditor actor={role} />
      </header>
      {admin ? (
        <>
          <label className="grid max-w-xs gap-2 text-sm font-semibold">
            حالة الطلب
            <select className="field" value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">الكل</option>
              {Object.entries(statuses).map(([id, label]) => <option value={id} key={id}>{label}</option>)}
            </select>
          </label>
          {feedback && <p role={feedback.error ? "alert" : "status"} className="soft-card p-3 text-sm">{feedback.text}</p>}
          {visible.length ? <ul className="grid gap-3">
            {visible.map((request) => {
              if (request.status === "reserved") return null;
              const group = groups.find(({ id }) => id === request.groupId);
              const student = accounts.find((account) => account.kind === "student" && account.entityId === request.studentId);
              return (
                <li key={request.id} className="soft-card space-y-3 p-4">
                  <h2 className="font-bold">{group?.name ?? "مجموعة غير متاحة"}</h2>
                  <p className="text-sm">{student?.name} · {formatGroupFee(request.fee)} · {statuses[request.status]}</p>
                  {request.status === "paid" && canApprove && (
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => {
                        const result = decideJoinRequest(request.id, "approved");
                        setFeedback(result.ok ? { text: "تم تفعيل العضوية." } : { text: result.error, error: true });
                      }}>تأكيد الدفع والموافقة</Button>
                      <Button variant="outline" onClick={() => {
                        const result = decideJoinRequest(request.id, "rejected");
                        setFeedback(result.ok ? { text: "تم رفض الطلب وتحرير المكان في المعاينة." } : { text: result.error, error: true });
                      }}>رفض وتحرير المكان</Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul> : <p className="soft-card p-5 text-sm text-muted-foreground">مفيش طلبات بالحالة دي.</p>}
        </>
      ) : (
        <ul className="grid gap-3">
          {groups.map((group) => (
            <li key={group.id} className="soft-card flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <h2 className="font-bold">{group.name}</h2>
                <p className="text-sm text-muted-foreground">{group.studentIds.length} من {group.capacity} · {formatGroupFee(group.fee)}</p>
              </div>
              <GroupEditor group={group} actor={role} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
