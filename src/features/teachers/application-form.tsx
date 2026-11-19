"use client";

import { useState } from "react";
import { TeacherProfileForm } from "./profile-form";
import { useTeacherApplications } from "./applications-context";

export function TeacherApplicationForm() {
  const { submit } = useTeacherApplications();
  const [submitted, setSubmitted] = useState(false);
  return submitted ? (
    <p role="status" className="rounded-xl border bg-secondary p-4 font-semibold">
      تم تسجيل طلبك في المعاينة وبقى قيد المراجعة.
    </p>
  ) : <TeacherProfileForm submitLabel="إرسال طلب الانضمام" onSave={(profile) => {
    const error = submit(profile);
    if (!error) setSubmitted(true);
    return error;
  }} />;
}
