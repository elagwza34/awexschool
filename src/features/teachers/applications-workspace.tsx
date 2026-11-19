"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import { usePermissions } from "@/features/dashboards/permissions-context";
import { useTeacherApplications } from "./applications-context";
import { TeacherProfileDetails } from "./profile-details";

const statuses = { pending: "قيد المراجعة", accepted: "مقبول", rejected: "مرفوض" } as const;

export function TeacherApplicationsWorkspace() {
  const { applications, decide } = useTeacherApplications();
  const { addAccount, isEntityActive } = useEnrollmentPreview();
  const { can } = usePermissions();
  const canReview = can("admin", "users:review-teachers") && isEntityActive("admin", "preview-admin");
  const canAdd = can("admin", "users:create") && can("admin", "page:users");
  const [filter, setFilter] = useState("");
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean }>();
  const visible = applications.filter(({ status }) => !filter || status === filter);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">طلبات المدرسين</h1>
        <p className="text-sm leading-7 text-muted-foreground">راجع الملف والفيديو إن وجد. قبول الطلب يضيف المدرس لقائمة المستخدمين في المعاينة.</p>
      </header>
      <label className="grid max-w-xs gap-2 text-sm font-semibold">
        حالة الطلب
        <select className="field" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="">كل الطلبات</option>
          {Object.entries(statuses).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      {feedback && <p role={feedback.error ? "alert" : "status"} className="rounded-lg border bg-secondary p-3 text-sm">{feedback.text}</p>}
      {visible.length === 0 ? (
        <p className="soft-card p-5 text-sm text-muted-foreground">
          {applications.length ? "مفيش طلبات بالحالة دي." : "لسه مفيش طلبات انضمام في المعاينة."}
        </p>
      ) : (
        <ul className="grid gap-3">
          {visible.map(({ id, profile, status }) => (
            <li key={id} className="soft-card p-4">
              <details>
                <summary className="min-h-11 cursor-pointer py-2">
                  <span className="font-bold">{profile.fullName}</span>{" · "}
                  <span className="text-sm text-muted-foreground">{statuses[status]}</span>
                </summary>
                <div className="space-y-4 border-t pt-4">
                  <TeacherProfileDetails profile={profile} />
                  {status === "pending" && canReview && (
                    <div className="flex flex-wrap gap-2">
                      {canAdd && <Button onClick={() => {
                        const result = addAccount({
                          kind: "teacher", name: profile.displayName, email: profile.email, teacherProfile: profile,
                        }, "admin");
                        if (!result.ok) { setFeedback({ text: result.error, error: true }); return; }
                        decide(id, "accepted");
                        setFeedback({ text: "تم قبول الطلب وإضافة المدرس في المعاينة." });
                      }}>قبول وإضافة المدرس</Button>}
                      <Button variant="outline" onClick={() => {
                        decide(id, "rejected");
                        setFeedback({ text: "تم رفض الطلب في المعاينة." });
                      }}>رفض الطلب</Button>
                    </div>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
