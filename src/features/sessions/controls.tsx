"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { usePortalPreview } from "@/features/dashboards/preview-context";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import { previewTeacherId } from "@/features/dashboards/chat-data";
import type {
  SessionDraft,
  SessionPreview,
  AttendanceInput,
} from "@/features/dashboards/management-types";
import { attendanceLabels } from "./logic";

export function AttendanceDialog({
  session,
  readOnly = false,
}: {
  session: SessionPreview;
  readOnly?: boolean;
}) {
  const { attendance, saveAttendance } = usePortalPreview();
  const { accounts, isEntityActive } = useEnrollmentPreview();
  const [open, setOpen] = useState(false),
    [marks, setMarks] = useState<Record<string, AttendanceInput>>({}),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const editable =
    !readOnly &&
    session.status !== "cancelled" &&
    isEntityActive("teacher", previewTeacherId);
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          setError("");
          if (value)
            setMarks(
              Object.fromEntries(
                session.studentIds.map((id) => [
                  id,
                  attendance[session.id]?.[id] ?? "unmarked",
                ]),
              ),
            );
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            {!editable ? "عرض سجل الحضور" : "تسجيل الحضور"}
          </Button>
        </DialogTrigger>
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>حضور {session.title}</DialogTitle>
            <DialogDescription>
              {session.groupName} · {session.date} · {session.time} — القاهرة.
              الطالب غير المسجل لا يُحسب غائبًا تلقائيًا.
            </DialogDescription>
          </DialogHeader>
          {session.status === "cancelled" && (
            <p className="text-sm">
              الحصة ملغاة: {session.cancellationReason}. السجل السابق محفوظ
              للمراجعة فقط.
            </p>
          )}
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const result = saveAttendance(session.id, marks);
              if (!result.ok) {
                setError(result.error ?? "تعذر حفظ الحضور.");
                return;
              }
              setOpen(false);
              setMessage("تم حفظ الحضور في المعاينة.");
            }}
          >
            <div className="space-y-3">
              {session.studentIds.map((id) => {
                const account = accounts.find(
                  (item) => item.kind === "student" && item.entityId === id,
                );
                return (
                  <div
                    key={id}
                    className="grid items-center gap-2 rounded-lg border p-3 sm:grid-cols-2"
                  >
                    <label
                      htmlFor={`attendance-${session.id}-${id}`}
                      className="text-sm font-semibold"
                    >
                      {account?.name ?? id}
                      {account?.status !== "نشط" ? ` · ${account?.status}` : ""}
                    </label>
                    {editable ? (
                      <select
                        id={`attendance-${session.id}-${id}`}
                        className="field"
                        value={marks[id] ?? "unmarked"}
                        onChange={(event) =>
                          setMarks((previous) => ({
                            ...previous,
                            [id]: event.target.value as AttendanceInput,
                          }))
                        }
                      >
                        {Object.entries(attendanceLabels).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    ) : (
                      <p className="text-sm">
                        {
                          attendanceLabels[
                            attendance[session.id]?.[id] ?? "unmarked"
                          ]
                        }
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {!session.studentIds.length && (
              <p role="status" className="text-sm">
                لا يوجد طلاب مسجلون في قائمة هذه الحصة.
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {editable && (
              <Button type="submit" disabled={!session.studentIds.length}>
                حفظ الحضور في المعاينة
              </Button>
            )}
          </form>
        </DialogContent>
      </Dialog>
      {message && (
        <p role="status" className="text-xs text-primary">
          {message}
        </p>
      )}
    </>
  );
}

export function SessionControls({ session }: { session: SessionPreview }) {
  const { updateSession, cancelSession, accruals } = usePortalPreview();
  const { groups, assignments, getTeacherCourses, isEntityActive } =
    useEnrollmentPreview();
  const [editOpen, setEditOpen] = useState(false),
    [cancelOpen, setCancelOpen] = useState(false),
    [draft, setDraft] = useState<SessionDraft>(session),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const availableCourses = getTeacherCourses(previewTeacherId);
  const availableGroups = groups.filter(
    (group) =>
      group.active &&
      group.courseId === draft.courseId &&
      assignments[group.courseId] === previewTeacherId,
  );
  const editable =
    session.status !== "cancelled" &&
    isEntityActive("teacher", previewTeacherId);
  const financiallyApproved = accruals.some((entry) => entry.sessionId === session.id);
  const update = <K extends keyof SessionDraft>(
    key: K,
    value: SessionDraft[K],
  ) => {
    setDraft((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "courseId"
        ? {
            groupId:
              groups.find((group) => group.active && group.courseId === value)
                ?.id ?? "",
          }
        : {}),
    }));
    setError("");
  };
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {financiallyApproved && (
        <p className="text-xs font-semibold text-primary">تم تأكيد تقديم الحصة واحتسابها ضمن المستحقات.</p>
      )}
      {editable && !financiallyApproved && (
        <>
          <Dialog
            open={editOpen}
            onOpenChange={(value) => {
              setEditOpen(value);
              setError("");
              if (value) setDraft(session);
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                تعديل الحصة
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>تعديل الحصة</DialogTitle>
                <DialogDescription>
                  تعديل محلي فقط. بعد تسجيل الحضور لا يمكن تغيير الموعد أو
                  المجموعة. قبل تسجيله، تُحدّث قائمة الطلاب من المجموعة عند
                  الحفظ.
                </DialogDescription>
              </DialogHeader>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const result = updateSession(session.id, draft);
                  if (result.error) {
                    setError(result.error);
                    return;
                  }
                  setEditOpen(false);
                  setMessage("تم تعديل الحصة في المعاينة.");
                }}
              >
                <div>
                  <label
                    htmlFor="edit-session-title"
                    className="mb-1 block text-sm font-semibold"
                  >
                    عنوان الحصة
                  </label>
                  <input
                    id="edit-session-title"
                    className="field"
                    value={draft.title}
                    onChange={(event) => update("title", event.target.value)}
                    required
                    minLength={3}
                    maxLength={140}
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-session-course"
                    className="mb-1 block text-sm font-semibold"
                  >
                    مقرر الحصة
                  </label>
                  <select
                    id="edit-session-course"
                    className="field"
                    value={draft.courseId}
                    onChange={(event) => update("courseId", event.target.value)}
                    required
                  >
                    {availableCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="edit-session-group"
                    className="mb-1 block text-sm font-semibold"
                  >
                    مجموعة الحصة
                  </label>
                  <select
                    id="edit-session-group"
                    className="field"
                    value={draft.groupId ?? ""}
                    onChange={(event) => update("groupId", event.target.value)}
                    required
                  >
                    <option value="" disabled>
                      اختر المجموعة
                    </option>
                    {availableGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="edit-session-date"
                      className="mb-1 block text-sm font-semibold"
                    >
                      تاريخ الحصة
                    </label>
                    <input
                      id="edit-session-date"
                      className="field"
                      type="date"
                      value={draft.date}
                      onChange={(event) => update("date", event.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-session-time"
                      className="mb-1 block text-sm font-semibold"
                    >
                      وقت الحصة — القاهرة
                    </label>
                    <input
                      id="edit-session-time"
                      className="field"
                      type="time"
                      value={draft.time}
                      onChange={(event) => update("time", event.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-session-duration"
                      className="mb-1 block text-sm font-semibold"
                    >
                      مدة الحصة
                    </label>
                    <input
                      id="edit-session-duration"
                      className="field"
                      type="number"
                      min={15}
                      max={180}
                      step={15}
                      value={draft.duration}
                      onChange={(event) =>
                        update("duration", Number(event.target.value))
                      }
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-session-provider"
                      className="mb-1 block text-sm font-semibold"
                    >
                      منصة الحصة
                    </label>
                    <select
                      id="edit-session-provider"
                      className="field"
                      value={draft.provider}
                      onChange={(event) =>
                        update(
                          "provider",
                          event.target.value as SessionDraft["provider"],
                        )
                      }
                    >
                      <option value="google-meet">Google Meet</option>
                      <option value="zoom">Zoom</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="edit-session-description"
                    className="mb-1 block text-sm font-semibold"
                  >
                    وصف الحصة
                  </label>
                  <textarea
                    id="edit-session-description"
                    className="field min-h-20 py-2"
                    maxLength={2000}
                    value={draft.description}
                    onChange={(event) =>
                      update("description", event.target.value)
                    }
                  />
                </div>
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit">حفظ تعديل الحصة</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog
            open={cancelOpen}
            onOpenChange={(value) => {
              setCancelOpen(value);
              setError("");
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                إلغاء الحصة
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>إلغاء الحصة</DialogTitle>
                <DialogDescription>
                  تظهر الحصة ملغاة للطالب وولي الأمر. يُحفظ السبب وسجل الحضور
                  السابق، ولا تُرسل إشعارات فعلية.
                </DialogDescription>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const result = cancelSession(
                    session.id,
                    String(form.get("reason")),
                  );
                  if (!result.ok) {
                    setError(result.error ?? "تعذر الإلغاء.");
                    return;
                  }
                  setCancelOpen(false);
                  setMessage("تم إلغاء الحصة في المعاينة.");
                }}
              >
                <label
                  htmlFor="session-cancel-reason"
                  className="block text-sm font-semibold"
                >
                  سبب إلغاء الحصة
                </label>
                <textarea
                  id="session-cancel-reason"
                  name="reason"
                  className="field min-h-24 py-2"
                  required
                  minLength={3}
                  maxLength={500}
                />
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit">تأكيد إلغاء الحصة</Button>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
      <AttendanceDialog session={session} readOnly={!editable} />
      {message && (
        <p role="status" className="w-full text-xs text-primary">
          {message}
        </p>
      )}
    </div>
  );
}
