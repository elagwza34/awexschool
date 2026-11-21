"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { requestStatusLabels } from "./staff-data";
import { useStaffPreview } from "./staff-context";
import { RequestReplies } from "./request-replies";
import { applicationStatuses, useTeacherApplications } from "@/features/teachers/applications-context";

export function TrackRequest({ kind }: { kind: "support" | "teacher" }) {
  const { requests } = useStaffPreview();
  const { applications } = useTeacherApplications();
  const [lookup, setLookup] = useState<{ reference: string; email: string }>();
  const ticket = kind === "support" && requests.find((item) => item.source === "visitor" &&
    item.id === lookup?.reference && item.contactEmail === lookup?.email);
  const application = kind === "teacher" && applications.find((item) =>
    item.id === lookup?.reference && item.profile.email === lookup?.email);
  return (
    <div className="container-shell max-w-3xl space-y-5 py-8">
      <h1 className="text-2xl font-bold">{kind === "teacher" ? "متابعة طلب انضمام مدرس" : "متابعة طلب الدعم"}</h1>
      <p className="text-sm leading-7 text-muted-foreground">اكتب رقم المتابعة والبريد اللي سجلت بيه الطلب في تبويب المعاينة ده.</p>
      <form className="soft-card grid gap-4 p-4" onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setLookup({
          reference: String(data.get("reference") ?? "").trim().toUpperCase(),
          email: String(data.get("email") ?? "").trim().toLowerCase(),
        });
      }}>
        <label className="grid gap-2 text-sm font-semibold">رقم المتابعة
          <input className="field" name="reference" dir="ltr" maxLength={64} required />
        </label>
        <label className="grid gap-2 text-sm font-semibold">البريد الإلكتروني
          <input className="field" name="email" dir="ltr" type="email" maxLength={254} required />
        </label>
        <Button className="justify-self-start">عرض حالة الطلب</Button>
      </form>
      {lookup && !ticket && !application && <p role="alert" className="soft-card p-4 text-sm">مفيش طلب مطابق. راجع رقم المتابعة والبريد.</p>}
      {ticket && (
        <section className="soft-card space-y-2 p-4">
          <h2 className="break-words font-bold">{ticket.title}</h2>
          <p role="status">الحالة: {requestStatusLabels[ticket.status]}</p>
          <RequestReplies replies={ticket.replies} />
        </section>
      )}
      {application && (
        <section className="soft-card p-4">
          <p role="status">حالة طلب الانضمام: {applicationStatuses[application.status]}</p>
        </section>
      )}
    </div>
  );
}
