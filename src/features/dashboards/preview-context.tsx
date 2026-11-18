"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { providerFixtures, teacherProfileFixture } from "./management-fixtures";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import { adminThreadsForRole } from "./admin-chat-data";
import {
  studentProfileFixture,
  type StudentProfileDraft,
} from "./student-profile-data";
import {
  chatMessageFixtures,
  previewTeacherId,
  type ChatMessage,
  type ChatRole,
} from "./chat-data";
import type {
  MeetingProvider,
  ProviderPreviewSettings,
  SessionDraft,
  SessionPreview,
  TeacherProfileDraft,
  AttendanceRegister,
  AttendanceInput,
  AttendanceStatus,
} from "./management-types";

import {
  validateSessionDraft,
  sessionConflict,
} from "@/features/sessions/logic";

interface PreviewContextValue {
  attendance: AttendanceRegister;
  updateSession: (
    id: string,
    draft: SessionDraft,
  ) => { session?: SessionPreview; error?: string };
  cancelSession: (
    id: string,
    reason: string,
  ) => { ok: boolean; error?: string };
  saveAttendance: (
    id: string,
    marks: Record<string, AttendanceInput>,
  ) => { ok: boolean; error?: string };
  chatMessages: ChatMessage[];
  sendChatMessage: (
    role: ChatRole,
    threadId: string,
    text: string,
  ) => { ok: boolean; error?: string };
  studentProfile: StudentProfileDraft;
  saveStudentProfile: (profile: StudentProfileDraft) => void;
  teacherProfile: TeacherProfileDraft;
  saveTeacherProfile: (profile: TeacherProfileDraft) => {
    ok: boolean;
    error?: string;
  };
  providers: Record<MeetingProvider, ProviderPreviewSettings>;
  saveProvider: (settings: ProviderPreviewSettings) => void;
  sessions: SessionPreview[];
  createSession: (draft: SessionDraft) => {
    session?: SessionPreview;
    error?: string;
  };
}
const PreviewContext = createContext<PreviewContextValue | null>(null);

export function PortalPreviewProvider({ children }: { children: ReactNode }) {
  const {
    getTeacherCourses,
    groups,
    assignments,
    threadsForRole,
    isEntityActive,
    saveTeacherSubject,
  } = useEnrollmentPreview();
  const [chatMessages, setChatMessages] =
    useState<ChatMessage[]>(chatMessageFixtures);
  const sendChatMessage: PreviewContextValue["sendChatMessage"] = (
    role,
    threadId,
    text,
  ) => {
    const content = text.trim();
    const senderEntity =
      role === "teacher"
        ? "ahmed-hassan"
        : role === "student"
          ? "youssef"
          : role === "parent"
            ? "preview-parent"
            : "preview-admin";
    if (!isEntityActive(role, senderEntity))
      return {
        ok: false,
        error: "المستخدم غير نشط في المعاينة؛ الإرسال متوقف.",
      };
    const adminThread = adminThreadsForRole(role).find(
      (thread) => thread.id === threadId,
    );
    if (adminThread && !isEntityActive(adminThread.role, adminThread.userId))
      return { ok: false, error: "المستلم غير نشط في المعاينة." };
    if (
      ![...threadsForRole(role), ...adminThreadsForRole(role)].some(
        (thread) => thread.id === threadId,
      )
    )
      return { ok: false, error: "المحادثة غير متاحة لهذا الدور في المعاينة." };
    if (!content || content.length > 2000)
      return { ok: false, error: "اكتب رسالة من حرف واحد إلى ٢٠٠٠ حرف." };
    setChatMessages((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        threadId,
        sender: role,
        text: content,
        sentAt: new Date().toISOString(),
      },
    ]);
    return { ok: true };
  };
  const [studentProfile, saveStudentProfile] = useState(studentProfileFixture);
  const [teacherProfile, setTeacherProfile] = useState(teacherProfileFixture);
  const saveTeacherProfile: PreviewContextValue["saveTeacherProfile"] = (
    profile,
  ) => {
    const fullName = profile.fullName.trim();
    const displayName = profile.displayName.trim();
    if (!fullName || !displayName)
      return { ok: false, error: "اكتب اسم المدرس واسم الظهور قبل الحفظ." };
    const result = saveTeacherSubject(previewTeacherId, profile.specialization);
    if (!result.ok) return result;
    setTeacherProfile({ ...profile, fullName, displayName });
    return { ok: true };
  };
  const [providers, setProviders] = useState(providerFixtures);
  const [sessions, setSessions] = useState<SessionPreview[]>([]);
  const saveProvider = (settings: ProviderPreviewSettings) =>
    setProviders((previous) => ({
      ...previous,
      [settings.provider]: { ...settings },
    }));
  const [attendance, setAttendance] = useState<AttendanceRegister>({});
  const meetingData = (draft: SessionDraft, id: string) => {
    const host = providers[draft.provider];
    const simulated = host.demoEnabled && host.autoCreate;
    return {
      timezone: host.timezone,
      hostName: host.hostName,
      hostEmail: host.hostEmail,
      meetingStatus: (!host.demoEnabled
        ? "awaiting_connection"
        : !host.autoCreate
          ? "disabled"
          : "simulated") as SessionPreview["meetingStatus"],
      meetingReference: simulated
        ? `${draft.provider === "google-meet" ? "MEET" : "ZOOM"}-DEMO-${id.slice(0, 8).toUpperCase()}`
        : undefined,
    };
  };
  const prepareSession = (
    draft: SessionDraft,
    existing?: SessionPreview,
  ): { session?: SessionPreview; error?: string } => {
    if (!isEntityActive("teacher", previewTeacherId))
      return { error: "المدرس غير نشط في المعاينة." };
    const error = validateSessionDraft(draft);
    if (error) return { error };
    if (
      !getTeacherCourses(previewTeacherId).some(
        (course) =>
          course.id === draft.courseId &&
          course.subjectId === teacherProfile.specialization,
      )
    )
      return { error: "المقرر غير مسند للمدرس ضمن مادته المحددة." };
    const group = groups.find(
      (group) =>
        group.id ===
        (draft.groupId ??
          groups.find((item) => item.active && item.courseId === draft.courseId)
            ?.id),
    );
    if (
      !group ||
      !group.active ||
      group.courseId !== draft.courseId ||
      assignments[group.courseId] !== previewTeacherId
    )
      return { error: "اختر مجموعة مفعّلة على مقرر مسند إليك." };
    const hasMarks =
      existing && Object.keys(attendance[existing.id] ?? {}).length > 0;
    if (
      hasMarks &&
      (existing.groupId !== group.id ||
        existing.date !== draft.date ||
        existing.time !== draft.time ||
        existing.duration !== draft.duration ||
        existing.courseId !== draft.courseId)
    )
      return {
        error:
          "لا يمكن تغيير المجموعة أو الموعد بعد تسجيل الحضور. ألغِ الحصة بسبب واضح وأنشئ موعدًا جديدًا عند الحاجة.",
      };
    const studentIds = hasMarks
      ? existing.studentIds
      : group.studentIds.filter((id) => isEntityActive("student", id));
    const id = existing?.id ?? crypto.randomUUID();
    const candidate: SessionPreview = {
      ...existing,
      ...draft,
      id,
      groupId: group.id,
      groupName: group.name,
      teacherId: previewTeacherId,
      teacherName: existing?.teacherName ?? teacherProfile.displayName,
      studentIds,
      status: "scheduled",
      ...(existing && existing.provider === draft.provider
        ? {
            timezone: existing.timezone,
            hostName: existing.hostName,
            hostEmail: existing.hostEmail,
            meetingStatus: existing.meetingStatus,
            meetingReference: existing.meetingReference,
          }
        : meetingData(draft, id)),
      title: draft.title.trim(),
      description: draft.description.trim(),
    };
    if (sessionConflict(candidate, sessions, existing?.id))
      return {
        error:
          "الموعد يتداخل مع حصة في المعاينة للمدرس أو المجموعة أو أحد الطلاب. اختار وقتًا مختلفًا.",
      };
    return { session: candidate };
  };
  const createSession: PreviewContextValue["createSession"] = (draft) => {
    const result = prepareSession(draft);
    if (result.session)
      setSessions((previous) => [result.session!, ...previous]);
    return result;
  };
  const updateSession: PreviewContextValue["updateSession"] = (id, draft) => {
    const existing = sessions.find(
      (session) => session.id === id && session.teacherId === previewTeacherId,
    );
    if (!existing || existing.status === "cancelled")
      return { error: "الحصة غير متاحة للتعديل." };
    const result = prepareSession(draft, existing);
    if (result.session)
      setSessions((previous) =>
        previous.map((session) =>
          session.id === id ? result.session! : session,
        ),
      );
    return result;
  };
  const cancelSession: PreviewContextValue["cancelSession"] = (id, reason) => {
    const session = sessions.find(
      (session) => session.id === id && session.teacherId === previewTeacherId,
    );
    if (
      !isEntityActive("teacher", previewTeacherId) ||
      !session ||
      session.status === "cancelled"
    )
      return { ok: false, error: "الحصة غير متاحة للإلغاء." };
    const cancellationReason = reason.trim();
    if (cancellationReason.length < 3 || cancellationReason.length > 500)
      return { ok: false, error: "اكتب سبب إلغاء من 3 إلى 500 حرف." };
    setSessions((previous) =>
      previous.map((item) =>
        item.id === id
          ? { ...item, status: "cancelled", cancellationReason }
          : item,
      ),
    );
    return { ok: true };
  };
  const saveAttendance: PreviewContextValue["saveAttendance"] = (id, marks) => {
    const session = sessions.find(
      (session) => session.id === id && session.teacherId === previewTeacherId,
    );
    if (
      !isEntityActive("teacher", previewTeacherId) ||
      !session ||
      session.status === "cancelled"
    )
      return { ok: false, error: "لا يمكن تسجيل الحضور لهذه الحصة." };
    if (
      Object.entries(marks).some(
        ([studentId, status]) =>
          !session.studentIds.includes(studentId) ||
          !["present", "absent", "late", "unmarked"].includes(status),
      )
    )
      return { ok: false, error: "راجع طلاب الحصة وحالات الحضور." };
    const normalized: Record<string, AttendanceStatus> = {};
    for (const studentId of session.studentIds) {
      const status = marks[studentId] ?? "unmarked";
      if (status !== "unmarked") normalized[studentId] = status;
    }
    setAttendance((previous) => ({ ...previous, [id]: normalized }));
    return { ok: true };
  };
  return (
    <PreviewContext.Provider
      value={{
        attendance,
        updateSession,
        cancelSession,
        saveAttendance,
        chatMessages,
        sendChatMessage,
        studentProfile,
        saveStudentProfile,
        teacherProfile,
        saveTeacherProfile,
        providers,
        saveProvider,
        sessions,
        createSession,
      }}
    >
      {children}
    </PreviewContext.Provider>
  );
}
export function usePortalPreview() {
  const context = useContext(PreviewContext);
  if (!context)
    throw new Error("Portal preview components require PortalPreviewProvider.");
  return context;
}
