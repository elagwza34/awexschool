import type { AssignmentDraft, Assignment, Submission } from "./types";
export function cairoDate(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}
export function validateAssignment(
  draft: AssignmentDraft,
  today = cairoDate(),
) {
  if (draft.title.trim().length < 3 || draft.title.trim().length > 140)
    return "العنوان من 3 إلى 140 حرفًا.";
  if (
    draft.instructions.trim().length < 5 ||
    draft.instructions.trim().length > 5000
  )
    return "التعليمات من 5 إلى 5000 حرف.";
  const date = new Date(`${draft.dueDate}T12:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.dueDate) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== draft.dueDate ||
    draft.dueDate < today
  )
    return "اختر موعد تسليم صحيحًا، اليوم أو بعده.";
  if (
    !Number.isInteger(draft.maxScore) ||
    draft.maxScore < 1 ||
    draft.maxScore > 1000
  )
    return "الدرجة النهائية عدد صحيح من 1 إلى 1000.";
}
export function submissionState(
  assignment: Assignment,
  submission?: Submission,
) {
  if (!submission) return "لم يُسلّم";
  if (submission.score !== undefined) return "تم التصحيح";
  return cairoDate(new Date(submission.submittedAt)) > assignment.dueDate
    ? "تسليم متأخر"
    : "بانتظار التصحيح";
}
