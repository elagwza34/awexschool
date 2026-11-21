"use client";

import { useActionState, type ReactNode } from "react";
import { AuthSubmit } from "@/features/auth/form-controls";
import { submitTeacherApplication } from "./application-actions";

export function LiveApplicationForm({ children }: { children: ReactNode }) {
  const [error, submit] = useActionState(submitTeacherApplication, "");
  return <form action={submit} className="grid gap-6">
    {children}
    {error && <p role="alert" className="rounded-lg border p-3 text-sm text-destructive">{error}</p>}
    <AuthSubmit>إرسال طلب الانضمام</AuthSubmit>
  </form>;
}
