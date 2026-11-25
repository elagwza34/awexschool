"use client";

import { useActionState, type ReactNode } from "react";
import { AuthSubmit } from "@/features/auth/form-controls";
import { submitTeacherApplication } from "./application-actions";
import { TeacherCaptcha } from "./teacher-captcha";

export function LiveApplicationForm({ children, captchaSiteKey }: { children: ReactNode; captchaSiteKey: string }) {
  const [error, submit] = useActionState(submitTeacherApplication, "");
  return <form action={submit} className="grid gap-6">
    {children}
    <TeacherCaptcha siteKey={captchaSiteKey} action="teacher_apply" />
    {error && <p role="alert" className="rounded-lg border p-3 text-sm text-destructive">{error}</p>}
    <AuthSubmit>إرسال طلب الانضمام</AuthSubmit>
  </form>;
}
