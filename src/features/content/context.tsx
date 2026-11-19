"use client";
import { createContext, useContext, type ReactNode } from "react";
import { grades } from "@/features/catalog/mock-data";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import { usePermissions } from "@/features/dashboards/permissions-context";
import { validateContent } from "./logic";
import type {
  ContentCourse,
  ContentRecord,
  ContentRole,
  ContentResult,
} from "./types";
interface Value {
  records: ContentRecord[];
  save: (
    course: ContentCourse,
    role: ContentRole,
    expectedRevision?: number,
  ) => ContentResult;
  transition: (
    id: string,
    action: "submit" | "withdraw" | "approve" | "changes" | "unpublish",
    role: ContentRole,
    note?: string,
  ) => ContentResult;
}
const Context = createContext<Value | null>(null);
export function ContentProvider({ children }: { children: ReactNode }) {
  const registry = useEnrollmentPreview();
  const { can } = usePermissions();
  const { contentRecords: storedRecords, setContentRecords: setRecords } =
    registry;
  // Published content and enrollment share the same state and owner registry.
  const records = storedRecords.map((record) => {
    const teacherId =
      registry.assignments[record.working.id] ?? record.working.teacherId;
    return {
      ...record,
      working: { ...record.working, teacherId },
      published: record.published
        ? { ...record.published, teacherId }
        : undefined,
    };
  });
  const canAccess = (role: ContentRole, course: ContentCourse) =>
    (can(role, "page:content") || can(role, "page:curricula")) &&
    (role === "admin"
      ? registry.isEntityActive("admin", "preview-admin")
      : role !== "teacher" || (course.teacherId === "ahmed-hassan" &&
        registry.isEntityActive("teacher", "ahmed-hassan")));
  const validAssignment = (course: ContentCourse) =>
    grades.some((g) => g.id === course.gradeId) &&
    registry.accounts.some(
      (a) => a.kind === "teacher" && a.entityId === course.teacherId,
    ) &&
    registry.teacherSubjects[course.teacherId] === course.subjectId;
  const save: Value["save"] = (course, role, expectedRevision) => {
    const existing = records.find((r) => r.working.id === course.id);
    if (
      !can(role, existing ? "content:edit" : "content:create") ||
      !canAccess(role, course) ||
      (existing && !canAccess(role, existing.working))
    )
      return { ok: false, error: "المحتوى غير متاح للتعديل لهذا الحساب." };
    if (
      existing &&
      (existing.status === "review" || existing.revision !== expectedRevision)
    )
      return {
        ok: false,
        error: "اسحب طلب المراجعة أولًا، أو افتح أحدث نسخة للتعديل.",
      };
    if (
      existing &&
      (existing.working.teacherId !== course.teacherId ||
        existing.working.subjectId !== course.subjectId ||
        existing.working.gradeId !== course.gradeId)
    )
      return {
        ok: false,
        error: "المدرس والمادة والصف ثابتون بعد إنشاء المقرر في المعاينة.",
      };
    const error = validateContent(course);
    if (error || !validAssignment(course))
      return {
        ok: false,
        error: error ?? "اختر مدرسًا ومادة متوافقين وصفًا صحيحًا.",
      };
    const record: ContentRecord = {
      working: structuredClone({ ...course, track: course.track ?? "arabic" }),
      published: existing?.published,
      retired: existing?.retired,
      revision: (existing?.revision ?? 0) + 1,
      publishedRevision: existing?.publishedRevision,
      status: "draft",
      reviewNote: existing?.reviewNote ?? "",
    };
    setRecords((items) =>
      existing
        ? items.map((r) => (r.working.id === course.id ? record : r))
        : [record, ...items],
    );
    return { ok: true };
  };
  const transition: Value["transition"] = (id, action, role, note = "") => {
    const record = records.find((r) => r.working.id === id);
    if (!record || !can(role, `content:${action}`) || !canAccess(role, record.working))
      return { ok: false, error: "المحتوى غير متاح لهذا الحساب." };
    let next = { ...record };
    if (action === "submit") {
      const error = validateContent(record.working, true);
      if (
        record.status === "review" ||
        record.status === "published" ||
        error ||
        !validAssignment(record.working)
      )
        return {
          ok: false,
          error: error ?? "راجع حالة المقرر وتوافق مادته مع المدرس.",
        };
      next = { ...next, status: "review", reviewNote: "" };
    } else if (action === "withdraw") {
      if (record.status !== "review")
        return { ok: false, error: "لا يوجد طلب مراجعة لسحبه." };
      next.status = "draft";
    } else if (action === "approve") {
      const error = validateContent(record.working, true);
      if (
        record.status !== "review" ||
        error ||
        !validAssignment(record.working)
      )
        return {
          ok: false,
          error: error ?? "أرسل النسخة الصحيحة للمراجعة أولًا.",
        };
      next = {
        ...next,
        published: structuredClone(record.working),
        publishedRevision: record.revision,
        status: "published",
        reviewNote: "",
      };
    } else {
      if (
        (action === "changes" && record.status !== "review") ||
        (action === "unpublish" && !record.published)
      )
        return { ok: false, error: "الإجراء غير متاح للحالة الحالية." };
      if (note.trim().length < 3 || note.trim().length > 1000)
        return { ok: false, error: "اكتب سببًا من 3 إلى 1000 حرف." };
      next =
        action === "changes"
          ? { ...next, status: "changes", reviewNote: note.trim() }
          : {
              ...next,
              published: undefined,
              retired: record.published,
              publishedRevision: undefined,
              status: "draft",
              reviewNote: note.trim(),
            };
    }
    setRecords((items) => items.map((r) => (r.working.id === id ? next : r)));
    return { ok: true };
  };
  return (
    <Context.Provider value={{ records, save, transition }}>
      {children}
    </Context.Provider>
  );
}
export function useContent() {
  const value = useContext(Context);
  if (!value) throw new Error("ContentProvider is required");
  return value;
}
