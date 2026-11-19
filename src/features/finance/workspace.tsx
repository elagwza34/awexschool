"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import { usePortalPreview } from "@/features/dashboards/preview-context";
import { usePermissions } from "@/features/dashboards/permissions-context";
import { previewTeacherId } from "@/features/dashboards/chat-data";
import { classHasEnded, teacherTotals } from "./logic";

const currency = new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" });
const money = (amount: number) => currency.format(amount / 100);

export function TeacherFinance({ role }: { role: "admin" | "teacher" }) {
  const admin = role === "admin";
  const { accounts, isEntityActive } = useEnrollmentPreview();
  const { sessions, sessionRates, accruals, saveSessionRate, approveSessionAccrual, recordTeacherPayout } = usePortalPreview();
  const { can } = usePermissions();
  const adminActive = admin && isEntityActive("admin", "preview-admin");
  const [teacherId, setTeacherId] = useState(previewTeacherId);
  const [result, setResult] = useState<{ error?: string; success: string }>();
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedId = admin ? teacherId : previewTeacherId;
  const teachers = accounts.filter((account) => account.kind === "teacher");
  const rate = sessionRates[selectedId];
  const entries = accruals.filter((entry) => entry.teacherId === selectedId);
  const approvedIds = new Set(entries.map((entry) => entry.sessionId));
  const unapproved = sessions.filter((session) => session.teacherId === selectedId &&
    session.status !== "cancelled" && !approvedIds.has(session.id) && classHasEnded(session, now));
  const totals = teacherTotals(entries, selectedId);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">{admin ? "مستحقات المدرسين" : "مستحقاتي"}</h1>
        <p className="text-sm leading-7 text-muted-foreground">
          المستحقات بالجنيه المصري. الحصة تدخل الرصيد بعد انتهاء موعدها بتوقيت القاهرة وتأكيد الإدارة إنها اتقدّمت. البيانات تجريبية.
        </p>
      </header>
      {admin && (
        <section className="soft-card grid gap-4 p-4 sm:grid-cols-2">
          <label className="grid content-start gap-2 text-sm font-semibold">
            المدرس
            <select className="field" value={selectedId} onChange={(event) => {
              setTeacherId(event.target.value);
              setResult(undefined);
            }}>
              {teachers.map((teacher) => <option key={teacher.id} value={teacher.entityId}>{teacher.name}</option>)}
            </select>
          </label>
          {can(role, "finance:rate") && (
            <form key={selectedId} className="grid gap-2" onSubmit={(event) => {
              event.preventDefault();
              const value = String(new FormData(event.currentTarget).get("rate") ?? "");
              setResult({ error: saveSessionRate(selectedId, value), success: "تم حفظ سعر الحصة." });
            }}>
              <label className="grid gap-2 text-sm font-semibold">
                سعر الحصة بالجنيه
                <input className="field" name="rate" inputMode="decimal" dir="ltr" maxLength={9} required
                  disabled={!adminActive} defaultValue={rate === undefined ? "" : (rate / 100).toFixed(2)} />
              </label>
              <p className="text-xs leading-6 text-muted-foreground">السعر الجديد يسري على الحصص التي تُعتمد بعد الحفظ.</p>
              <Button type="submit" className="justify-self-start" disabled={!adminActive}>حفظ سعر الحصة</Button>
            </form>
          )}
        </section>
      )}
      {result && <p role={result.error ? "alert" : "status"} className="rounded-lg border bg-secondary p-3 text-sm">{result.error ?? result.success}</p>}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["الحصص المعتمدة", totals.count],
          ["إجمالي المستحقات", money(totals.earned)],
          ["إجمالي المصروف", money(totals.paid)],
          ["الرصيد المستحق", money(totals.due)],
        ].map(([label, value]) => (
          <div key={label} className="soft-card min-w-0 p-3 sm:p-4">
            <dt className="text-xs text-muted-foreground sm:text-sm">{label}</dt>
            <dd className="mt-2 text-lg font-bold break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">سعر الحصة الحالي: {rate === undefined ? "لسه ما اتحددش" : money(rate)}</p>
      {admin && (
        <section className="soft-card space-y-3 p-4">
          <h2 className="text-lg font-bold">حصص انتهى موعدها وبانتظار التأكيد</h2>
          {unapproved.length === 0 ? <p className="text-sm text-muted-foreground">مفيش حصص بانتظار التأكيد للمدرس ده.</p> : (
            <ul className="grid gap-2">
              {unapproved.map((session) => (
                <li key={session.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                  <div>
                    <h3 className="font-semibold">{session.title}</h3>
                    <p className="text-xs text-muted-foreground"><bdi>{session.date} · {session.time}</bdi></p>
                    {rate === undefined && <p className="text-xs text-muted-foreground">حدد سعر الحصة عشان تعتمدها.</p>}
                  </div>
                  {can(role, "finance:approve") && (
                    <Button variant="outline" disabled={!adminActive || rate === undefined} onClick={() =>
                      setResult({ error: approveSessionAccrual(session.id), success: "تم اعتماد الحصة وإضافتها إلى الرصيد." })
                    }>تأكيد تقديم الحصة</Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <section className="soft-card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">سجل الحصص المعتمدة</h2>
          {admin && can(role, "finance:pay") && totals.due > 0 && (
            <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
              <DialogTrigger asChild><Button disabled={!adminActive}>تسجيل صرف الرصيد</Button></DialogTrigger>
              <DialogContent dir="rtl">
                <DialogHeader>
                  <DialogTitle>تأكيد تسجيل الصرف</DialogTitle>
                  <DialogDescription>
                    هيتسجل صرف {money(totals.due)} لجميع الحصص المستحقة للمدرس المحدد في المعاينة.
                  </DialogDescription>
                </DialogHeader>
                <Button onClick={() => {
                  const error = recordTeacherPayout(selectedId);
                  setResult({ error, success: "تم تسجيل صرف الرصيد في المعاينة." });
                  setPayoutOpen(false);
                }}>تأكيد تسجيل الصرف</Button>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {entries.length === 0 ? <p className="text-sm text-muted-foreground">مفيش حصص معتمدة لسه.</p> : (
          <ul className="grid gap-2">
            {[...entries].reverse().map((entry) => (
              <li key={entry.sessionId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <h3 className="font-semibold">{entry.title}</h3>
                  <p className="text-xs text-muted-foreground"><bdi>{entry.date}</bdi></p>
                </div>
                <div className="text-sm">
                  <p className="font-semibold">{money(entry.amount)}</p>
                  <p className="text-xs text-muted-foreground">{entry.paidAt ? "تم تسجيل الصرف" : "مستحقة"}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
