"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { previewStudentId } from "@/features/dashboards/chat-data";
import { groupChatHref, groupChatPermission } from "@/features/chat/groups";
import { usePermissions } from "@/features/dashboards/permissions-context";
import { useEnrollmentPreview } from "./context";
import { formatGroupFee, groupDays } from "./registration";

const timeFormat = new Intl.DateTimeFormat("ar-EG", { timeStyle: "short", timeZone: "Africa/Cairo" });

export function StudentSubscriptions() {
  const { groups, joinRequests, isEntityActive } = useEnrollmentPreview();
  const { can } = usePermissions();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const studentActive = isEntityActive("student", previewStudentId);
  const requests = joinRequests.filter((request) => request.studentId === previewStudentId).reverse();
  const memberships = groups.filter((group) => group.studentIds.includes(previewStudentId));
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">اشتراكاتي</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">تابع حجوزاتك وطلبات الانضمام والمجموعات اللي اتفعّلت.</p>
        </div>
        <Button asChild variant="outline"><Link href="/groups">تصفّح المجموعات</Link></Button>
      </header>
      <section className="soft-card space-y-3 p-4">
        <h2 className="text-lg font-bold">مجموعاتي</h2>
        {memberships.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {memberships.map((group) => (
              <li key={group.id} className="space-y-2 rounded-lg border p-3">
                <p className="font-semibold break-words">{group.name}</p>
                <p className="text-sm text-muted-foreground">{group.active ? "العضوية مفعّلة" : "المجموعة متوقفة"}</p>
                {group.day && <p className="text-sm">{groupDays[group.day as keyof typeof groupDays]} <bdi>{group.time}</bdi> · القاهرة</p>}
                {studentActive && group.active && can("student", groupChatPermission) && (
                  <Button asChild variant="outline"><Link href={groupChatHref("student", group.id)}>افتح شات المجموعة</Link></Button>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">لسه مفيش مجموعات اشتركت فيها.</p>}
      </section>
      <section className="soft-card space-y-3 p-4">
        <h2 className="text-lg font-bold">الحجوزات وطلبات الانضمام</h2>
        {requests.length ? (
          <ul className="divide-y">
            {requests.map((request) => {
              const group = groups.find(({ id }) => id === request.groupId);
              const pending = request.status === "reserved" && request.expiresAt > now;
              const status = request.status === "paid" ? "الدفع مسجّل وبانتظار موافقة الإدارة"
                : request.status === "approved" ? (group?.active && group.studentIds.includes(previewStudentId) ? "العضوية مفعّلة" : "العضوية غير متاحة حاليًا")
                  : request.status === "rejected" ? "الطلب مرفوض" : pending ? "حجز مؤقت · بانتظار الدفع" : "الحجز انتهى";
              return (
                <li key={request.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="space-y-1">
                    <p className="font-semibold">{group?.name ?? "مجموعة غير متاحة"}</p>
                    <p className="text-sm">{status} · {formatGroupFee(request.fee)}</p>
                    {pending && <p className="text-xs text-muted-foreground">ينتهي الساعة {timeFormat.format(request.expiresAt)} بتوقيت القاهرة.</p>}
                  </div>
                  {studentActive && group?.active && request.status === "reserved" && (
                    <Button asChild variant="outline"><Link href={`/groups?join=${encodeURIComponent(group.id)}`}>{pending ? "كمّل الدفع" : "احجز من جديد"}</Link></Button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sm text-muted-foreground">لسه مفيش حجوزات أو طلبات انضمام.</p>}
      </section>
    </div>
  );
}
