"use client";
import { TeacherAvatar } from "@/components/teacher-avatar";
import { useState } from "react";
import { Panel } from "@/features/dashboards/dashboard-panels";
import { Badge } from "@/components/shared";
import { usePortalPreview } from "@/features/dashboards/preview-context";
import {
  previewTeacherId,
  previewStudentId,
} from "@/features/dashboards/chat-data";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import { AttendanceDialog } from "./controls";
import { attendanceLabels } from "./logic";

export function SessionRecords({
  role,
  studentId,
  id,
}: {
  role: "admin" | "teacher" | "student" | "parent";
  studentId?: string;
  id?: string;
}) {
  const { sessions, attendance } = usePortalPreview();
  const { resolveCourse } = useEnrollmentPreview();
  const [teacherFilter, setTeacherFilter] = useState(""),
    [groupFilter, setGroupFilter] = useState(""),
    [date, setDate] = useState(""),
    [status, setStatus] = useState("");
  const learnerId = role === "student" ? previewStudentId : studentId;
  const eligible = sessions.filter((session) =>
    role === "admin"
      ? true
      : role === "teacher"
        ? session.teacherId === previewTeacherId
        : !!learnerId && session.studentIds.includes(learnerId),
  );
  const teacherOptions = [
    ...new Map(
      eligible.map((session) => [session.teacherId, session.teacherName]),
    ).entries(),
  ];
  const groupOptions = [
    ...new Map(
      eligible.map((session) => [session.groupId, session.groupName]),
    ).entries(),
  ];
  const visible = eligible
    .filter(
      (session) =>
        (!teacherFilter || session.teacherId === teacherFilter) &&
        (!groupFilter || session.groupId === groupFilter) &&
        (!date || session.date === date) &&
        (!status || session.status === status),
    )
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
    );
  return (
    <Panel
      id={id}
      title="الحصص والحضور"
      subtitle="المواعيد بتوقيت القاهرة. السجلات للحصص التي أنشأها المدرس في المعاينة؛ عدم تسجيل الطالب لا يعني الغياب."
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {role === "admin" && (
          <div>
            <label
              htmlFor="records-teacher"
              className="mb-1 block text-sm font-semibold"
            >
              تصفية المدرس
            </label>
            <select
              id="records-teacher"
              className="field"
              value={teacherFilter}
              onChange={(event) => setTeacherFilter(event.target.value)}
            >
              <option value="">كل المدرسين</option>
              {teacherOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label
            htmlFor="records-group"
            className="mb-1 block text-sm font-semibold"
          >
            تصفية المجموعة
          </label>
          <select
            id="records-group"
            className="field"
            value={groupFilter}
            onChange={(event) => setGroupFilter(event.target.value)}
          >
            <option value="">كل المجموعات</option>
            {groupOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="records-date"
            className="mb-1 block text-sm font-semibold"
          >
            تصفية تاريخ الحصة
          </label>
          <input
            id="records-date"
            className="field"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="records-status"
            className="mb-1 block text-sm font-semibold"
          >
            حالة الحصة
          </label>
          <select
            id="records-status"
            className="field"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">كل الحالات</option>
            <option value="scheduled">مجدولة</option>
            <option value="cancelled">ملغاة</option>
          </select>
        </div>
      </div>
      <div className="space-y-3">
        {visible.map((session) => {
          const marks = attendance[session.id] ?? {};
          return (
            <article
              key={session.id}
              data-session-id={session.id}
              className="rounded-lg border p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{session.title}</h3>
                <Badge
                  className={
                    session.status === "cancelled"
                      ? "bg-muted text-foreground"
                      : ""
                  }
                >
                  {session.status === "cancelled" ? "ملغاة" : "مجدولة"}
                </Badge>
              </div>
              <p className="mt-2 flex items-center gap-2 text-sm">
                <TeacherAvatar teacherId={session.teacherId} className="size-6" />
                {session.groupName} · {session.teacherName}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {resolveCourse(session.courseId)?.title} ·{" "}
                <bdi>{session.date}</bdi> · <bdi>{session.time}</bdi> ·{" "}
                {session.duration} دقيقة · القاهرة
              </p>
              {session.status === "cancelled" && (
                <p className="mt-3 text-sm">
                  سبب الإلغاء: {session.cancellationReason}
                </p>
              )}
              {learnerId ? (
                <p className="mt-3 text-sm font-semibold">
                  {session.status === "cancelled"
                    ? "الحصة ملغاة؛ لا تُحتسب غيابًا."
                    : `حالة الحضور: ${attendanceLabels[marks[learnerId] ?? "unmarked"]}`}
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  {Object.entries(attendanceLabels).map(([value, label]) => (
                    <span key={value}>
                      {label}:{" "}
                      {
                        session.studentIds.filter(
                          (studentId) =>
                            (marks[studentId] ?? "unmarked") === value,
                        ).length
                      }
                    </span>
                  ))}
                </div>
              )}
              {role === "teacher" && (
                <div className="mt-3">
                  <AttendanceDialog session={session} />
                </div>
              )}
              {role === "admin" && (
                <div className="mt-3">
                  <AttendanceDialog session={session} readOnly />
                </div>
              )}
            </article>
          );
        })}
      </div>
      {!visible.length && (
        <p role="status" className="py-5 text-sm text-muted-foreground">
          لا توجد حصص مطابقة للعرض.
        </p>
      )}
    </Panel>
  );
}
