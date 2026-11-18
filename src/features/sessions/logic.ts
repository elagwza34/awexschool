import type {
  SessionDraft,
  SessionPreview,
  AttendanceInput,
} from "@/features/dashboards/management-types";

export const attendanceLabels: Record<AttendanceInput, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  unmarked: "لم يسجل",
};
export function validateSessionDraft(draft: SessionDraft) {
  if (draft.title.trim().length < 3 || draft.title.trim().length > 140)
    return "اكتب عنوانًا من 3 إلى 140 حرفًا.";
  const date = new Date(`${draft.date}T12:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.date) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== draft.date
  )
    return "اختر تاريخًا صحيحًا للحصة.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time))
    return "اختر وقتًا صحيحًا للحصة.";
  if (
    !Number.isInteger(draft.duration) ||
    draft.duration < 15 ||
    draft.duration > 180 ||
    draft.duration % 15 !== 0
  )
    return "مدة الحصة من 15 إلى 180 دقيقة، بمضاعفات 15 دقيقة.";
  if (sessionMinutes(draft.time) + draft.duration > 1440)
    return "اختار موعدًا تنتهي فيه الحصة في اليوم نفسه لهذه المعاينة.";
  if (!["google-meet", "zoom"].includes(draft.provider))
    return "اختر منصة اجتماع صحيحة.";
  if (draft.description.length > 2000) return "وصف الحصة لا يزيد عن 2000 حرف.";
  return undefined;
}
export function sessionMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
export function sessionConflict(
  candidate: Pick<
    SessionPreview,
    "date" | "time" | "duration" | "teacherId" | "groupId" | "studentIds"
  >,
  sessions: SessionPreview[],
  excludeId?: string,
) {
  const start = sessionMinutes(candidate.time),
    end = start + candidate.duration;
  return sessions.some(
    (session) =>
      session.id !== excludeId &&
      session.status !== "cancelled" &&
      session.date === candidate.date &&
      start < sessionMinutes(session.time) + session.duration &&
      end > sessionMinutes(session.time) &&
      (session.teacherId === candidate.teacherId ||
        session.groupId === candidate.groupId ||
        session.studentIds.some((id) => candidate.studentIds.includes(id))),
  );
}
