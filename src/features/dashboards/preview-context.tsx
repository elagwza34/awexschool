"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { providerFixtures, teacherProfileFixture } from "./management-fixtures";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import { classHasEnded, parseSessionRate, type SessionAccrual } from "@/features/finance/logic";
import { usePermissions } from "./permissions-context";
import type { Permission } from "./permissions";
import { attachmentError } from "@/features/chat/attachment";
import { groupChatPermission, isGroupChatMember } from "@/features/chat/groups";
import { previewStudentId } from "./chat-data";
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
  sessionRates: Record<string, number>;
  accruals: SessionAccrual[];
  saveSessionRate: (teacherId: string, value: string) => string | undefined;
  approveSessionAccrual: (id: string) => string | undefined;
  recordTeacherPayout: (teacherId: string) => string | undefined;
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
    attachment?: File,
  ) => { ok: boolean; error?: string };
  sendGroupMessage: (role: "student" | "teacher", groupId: string, text: string, attachment?: File) => { ok: boolean; error?: string };
  groupMessages: ChatMessage[];
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
  const { can } = usePermissions();
  const {
    accounts,
    getTeacherCourses,
    groups,
    assignments,
    threadsForRole,
    isEntityActive,
    saveTeacherSubject,
  } = useEnrollmentPreview();
  const [chatMessages, setChatMessages] =
    useState<ChatMessage[]>(chatMessageFixtures);
  const [groupMessages, setGroupMessages] = useState<ChatMessage[]>([]);
  const sendChatMessage: PreviewContextValue["sendChatMessage"] = (
    role,
    threadId,
    text,
    attachment,
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
    const fileError = attachment && attachmentError(attachment);
    if (fileError) return { ok: false, error: fileError };
    if ((!content && !attachment) || content.length > 2000)
      return { ok: false, error: "اكتب رسالة لحد ٢٠٠٠ حرف أو اختار مرفق." };
    setChatMessages((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        threadId,
        sender: role,
        text: content,
        attachment,
        sentAt: new Date().toISOString(),
      },
    ]);
    return { ok: true };
  };
  const [studentProfile, saveStudentProfile] = useState(studentProfileFixture);
  const [teacherProfile, setTeacherProfile] = useState(teacherProfileFixture);
  const sendGroupMessage: PreviewContextValue["sendGroupMessage"] = (role, groupId, text, attachment) => {
    const group = groups.find(({ id }) => id === groupId);
    const memberId = role === "student" ? previewStudentId : previewTeacherId;
    if (!can(role, groupChatPermission) || !group || !isGroupChatMember(role, group, assignments) ||
      !isEntityActive(role, memberId))
      return { ok: false, error: "الشات متاح للأعضاء النشطين في المجموعة." };
    const content = text.trim();
    const fileError = attachment && attachmentError(attachment);
    if (fileError) return { ok: false, error: fileError };
    if ((!content && !attachment) || content.length > 2000)
      return { ok: false, error: "اكتب رسالة لحد ٢٠٠٠ حرف أو اختار مرفق." };
    const message = {
      id: crypto.randomUUID(), threadId: groupId, sender: role,
      senderName: role === "student" ? studentProfile.displayName : teacherProfile.displayName,
      text: content, attachment, sentAt: new Date().toISOString(),
    };
    setGroupMessages((previous) => [...previous, message]);
    return { ok: true };
  };
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
  const [sessionRates, setSessionRates] = useState<Record<string, number>>({});
  const [accruals, setAccruals] = useState<SessionAccrual[]>([]);
  const canManageFinance = (permission: Permission) =>
    can("admin", "page:finance") && can("admin", permission) &&
    isEntityActive("admin", "preview-admin");

  function saveSessionRate(teacherId: string, value: string) {
    if (!canManageFinance("finance:rate")) return "صلاحية تحديد سعر الحصة غير متاحة.";
    if (!accounts.some((account) => account.kind === "teacher" && account.entityId === teacherId))
      return "المدرس غير موجود في المعاينة.";
    const amount = parseSessionRate(value);
    if (amount === undefined) return "اكتب سعرًا من 0.01 إلى 999999.99 جنيه، بمنزلتين عشريتين بحد أقصى.";
    setSessionRates((previous) => ({ ...previous, [teacherId]: amount }));
  }

  function approveSessionAccrual(id: string) {
    if (!canManageFinance("finance:approve")) return "صلاحية اعتماد الحصة غير متاحة.";
    const session = sessions.find((item) => item.id === id);
    if (!session || session.status === "cancelled" || !classHasEnded(session, new Date()))
      return "اعتمد الحصة بعد انتهاء موعدها. الحصص الملغاة لا تُحتسب.";
    if (accruals.some((entry) => entry.sessionId === id)) return "الحصة معتمدة بالفعل.";
    const amount = sessionRates[session.teacherId];
    if (amount === undefined) return "حدد سعر الحصة لهذا المدرس أولًا.";
    setAccruals((previous) => previous.some((entry) => entry.sessionId === id) ? previous : [
      ...previous,
      { sessionId: id, teacherId: session.teacherId, title: session.title, date: session.date, amount },
    ]);
  }

  function recordTeacherPayout(teacherId: string) {
    if (!canManageFinance("finance:pay")) return "صلاحية تسجيل الصرف غير متاحة.";
    const pendingIds = new Set(accruals.filter((entry) => entry.teacherId === teacherId && !entry.paidAt).map((entry) => entry.sessionId));
    if (!pendingIds.size) return "لا توجد حصص مستحقة لهذا المدرس.";
    const paidAt = new Date().toISOString();
    setAccruals((previous) => previous.map((entry) =>
      pendingIds.has(entry.sessionId) && !entry.paidAt ? { ...entry, paidAt } : entry,
    ));
  }
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
    if (!existing || existing.status === "cancelled" || accruals.some((entry) => entry.sessionId === id))
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
      session.status === "cancelled" ||
      accruals.some((entry) => entry.sessionId === id)
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
        sessionRates,
        accruals,
        saveSessionRate,
        approveSessionAccrual,
        recordTeacherPayout,
        attendance,
        updateSession,
        cancelSession,
        saveAttendance,
        chatMessages,
        sendChatMessage,
        sendGroupMessage,
        groupMessages,
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
