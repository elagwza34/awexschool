"use client";

import { useState } from "react";
import Link from "next/link";
import { TeacherProfileForm } from "./profile-form";
import { useTeacherApplications } from "./applications-context";

export function TeacherApplicationForm() {
  const { submit } = useTeacherApplications();
  const [reference, setReference] = useState("");
  return (
    <div className="space-y-4">
      {reference ? <p role="status" className="rounded-xl border bg-secondary p-4 font-semibold">
        تم تسجيل طلبك في المعاينة وبقى قيد المراجعة. رقم المتابعة <bdi>{reference}</bdi>.
      </p> : <TeacherProfileForm submitLabel="إرسال طلب الانضمام" onSave={(profile) => {
        const result = submit(profile);
        if ("error" in result) return result.error;
        setReference(result.id);
      }} />}
      <Link href="/teachers/track" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline">متابعة طلب انضمام مدرس</Link>
    </div>
  );
}
