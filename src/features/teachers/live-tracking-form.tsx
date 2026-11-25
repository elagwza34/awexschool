"use client";

import { useActionState } from "react";
import { AuthSubmit } from "@/features/auth/form-controls";
import { trackTeacherApplication } from "./application-actions";
import { TeacherCaptcha } from "./teacher-captcha";

const statuses: Record<string, string> = {
  pending: "قيد المراجعة",
  accepted: "تم قبول الطلب",
  rejected: "لم يُقبل الطلب",
};

export function LiveTrackingForm({ reference = "", captchaSiteKey }: { reference?: string; captchaSiteKey: string }) {
  const [state, submit] = useActionState(trackTeacherApplication, "");

  return <form action={submit} className="soft-card mt-5 grid gap-4 p-5">
    <label className="grid gap-2 text-sm font-semibold">رقم المتابعة
      <input className="field" name="reference" dir="ltr" defaultValue={reference} maxLength={36} required />
    </label>
    <label className="grid gap-2 text-sm font-semibold">البريد الإلكتروني
      <input className="field" name="email" type="email" dir="ltr" autoComplete="email" maxLength={254} required />
    </label>
    <TeacherCaptcha siteKey={captchaSiteKey} action="teacher_track" />
    {state && <p role="status" className="rounded-lg border p-3 text-sm leading-7">{statuses[state] ?? state}</p>}
    <AuthSubmit>عرض حالة الطلب</AuthSubmit>
  </form>;
}
