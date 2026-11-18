"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import { usePortalPreview } from "@/features/dashboards/preview-context";
import {
  previewStudentId,
  previewTeacherId,
} from "@/features/dashboards/chat-data";
import { validateAssignment } from "./logic";
import type { Assignment, AssignmentDraft, Submission, Result } from "./types";
interface Value {
  assignments: Assignment[];
  submissions: Submission[];
  create: (draft: AssignmentDraft) => Result;
  submit: (id: string, answer: string) => Result;
  grade: (
    id: string,
    studentId: string,
    score: number,
    feedback: string,
  ) => Result;
}
const Context = createContext<Value | null>(null);
export function AssignmentProvider({ children }: { children: ReactNode }) {
  const registry = useEnrollmentPreview();
  const { sessions, teacherProfile } = usePortalPreview();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const create: Value["create"] = (draft) => {
    const error = validateAssignment(draft);
    if (error) return { ok: false, error };
    const group = registry.groups.find(
      (g) =>
        g.id === draft.groupId &&
        g.active &&
        registry.assignments[g.courseId] === previewTeacherId,
    );
    if (!registry.isEntityActive("teacher", previewTeacherId) || !group || !registry.catalogCourses.some(c => c.id === group.courseId))
      return { ok: false, error: "اختر مجموعة مفعلة ومسندة إليك." };
    const session = draft.sessionId
      ? sessions.find(
          (s) =>
            s.id === draft.sessionId &&
            s.groupId === group.id &&
            s.teacherId === previewTeacherId &&
            s.status !== "cancelled",
        )
      : undefined;
    if (draft.sessionId && !session)
      return { ok: false, error: "الحصة غير متاحة لهذه المجموعة." };
    const studentIds = group.studentIds.filter((id) =>
      registry.isEntityActive("student", id),
    );
    if (!studentIds.length)
      return { ok: false, error: "أضف طلابًا نشطين للمجموعة أولًا." };
    setAssignments((previous) => [
      {
        ...draft,
        id: crypto.randomUUID(),
        title: draft.title.trim(),
        instructions: draft.instructions.trim(),
        groupName: group.name,
        courseId: group.courseId,
        teacherId: previewTeacherId,
        teacherName: teacherProfile.displayName,
        studentIds,
        sessionTitle: session?.title,
      },
      ...previous,
    ]);
    return { ok: true };
  };
  const submit: Value["submit"] = (id, answer) => {
    const assignment = assignments.find(
      (a) => a.id === id && a.studentIds.includes(previewStudentId),
    );
    if (!assignment || !registry.isEntityActive("student", previewStudentId))
      return { ok: false, error: "الواجب غير متاح للتسليم." };
    const previous = submissions.find(
      (s) => s.assignmentId === id && s.studentId === previewStudentId,
    );
    if (previous?.score !== undefined)
      return { ok: false, error: "تم تصحيح الإجابة؛ لا يمكن استبدالها." };
    if (!answer.trim() || answer.trim().length > 10000)
      return { ok: false, error: "اكتب إجابة من 1 إلى 10000 حرف." };
    setSubmissions((items) => [
      ...items.filter(
        (s) => !(s.assignmentId === id && s.studentId === previewStudentId),
      ),
      {
        assignmentId: id,
        studentId: previewStudentId,
        answer: answer.trim(),
        submittedAt: new Date().toISOString(),
      },
    ]);
    return { ok: true };
  };
  const grade: Value["grade"] = (id, studentId, score, feedback) => {
    const assignment = assignments.find(
      (a) =>
        a.id === id &&
        a.teacherId === previewTeacherId &&
        a.studentIds.includes(studentId),
    );
    if (
      !assignment ||
      !registry.isEntityActive("teacher", previewTeacherId) ||
      !submissions.some(
        (s) => s.assignmentId === id && s.studentId === studentId,
      )
    )
      return { ok: false, error: "لا توجد إجابة متاحة للتصحيح." };
    if (
      !Number.isFinite(score) ||
      score < 0 ||
      score > assignment.maxScore ||
      feedback.trim().length < 3 ||
      feedback.trim().length > 2000
    )
      return {
        ok: false,
        error: `الدرجة من 0 إلى ${assignment.maxScore} والملاحظات من 3 إلى 2000 حرف.`,
      };
    setSubmissions((items) =>
      items.map((s) =>
        s.assignmentId === id && s.studentId === studentId
          ? { ...s, score, feedback: feedback.trim() }
          : s,
      ),
    );
    return { ok: true };
  };
  return (
    <Context.Provider
      value={{ assignments, submissions, create, submit, grade }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAssignments() {
  const value = useContext(Context);
  if (!value) throw new Error("AssignmentProvider is required");
  return value;
}
