"use client";
import { usePermissions } from "@/features/dashboards/permissions-context";
import type { DashboardRole } from "@/features/dashboards/types";
import type { TeacherProfileDraft } from "@/features/dashboards/management-types";
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  teachers,
  getSubject,
  getTeacher,
  getGrade,
} from "@/features/catalog/mock-data";
import { children, weeklyActivity } from "@/features/dashboards/mock-data";
import {
  staffMemberFixtures,
  isStaffRole,
  type StaffMember,
} from "@/features/dashboards/staff-data";
import type { DemoChild, LearningCourse } from "@/features/dashboards/types";
import {
  previewStudentId,
  previewTeacherId,
  type ChatThread,
  type ChatRole,
} from "@/features/dashboards/chat-data";
import {
  accountFixtures,
  courseAssignmentFixtures,
  groupFixtures,
  guardianLinkFixtures,
  studentFixtures,
  type PreviewAccount,
  type LearningGroup,
  type GuardianLink,
  type MutationResult,
} from "./data";

import type { SubjectId } from "@/features/catalog/types";
import { teacherSubjectConflict } from "@/features/catalog/teacher-assignments";
import { contentFixtures } from "@/features/content/data";
import { toPortalCourse, type PortalCourse } from "@/features/content/catalog";
import type { ContentRecord } from "@/features/content/types";
import { availableSeats, groupDays, holdsSeat, reservationDuration, type JoinRequest } from "./registration";

interface EnrollmentValue {
  contentRecords: ContentRecord[];
  setContentRecords: Dispatch<SetStateAction<ContentRecord[]>>;
  catalogCourses: PortalCourse[];
  teacherSubjects: Record<string, SubjectId>;
  teacherProfiles: Record<string, TeacherProfileDraft>;
  saveTeacherSubject: (
    teacherId: string,
    subjectId: SubjectId,
  ) => MutationResult;
  accounts: PreviewAccount[];
  groups: LearningGroup[];
  joinRequests: JoinRequest[];
  reserveSeat: (groupId: string) => MutationResult;
  payReservation: (id: string) => MutationResult;
  decideJoinRequest: (id: string, decision: "approved" | "rejected") => MutationResult;
  assignments: Record<string, string>;
  guardianLinks: GuardianLink[];
  staffMembers: StaffMember[];
  addStaffMember: (draft: Omit<StaffMember, "id">) => MutationResult;
  addAccount: (
    draft: Pick<PreviewAccount, "name" | "email" | "kind"> & { teacherProfile?: TeacherProfileDraft },
    actor: DashboardRole,
  ) => MutationResult;
  updateAccount: (
    id: string,
    draft: Pick<PreviewAccount, "name" | "email" | "status">,
    actor: DashboardRole,
  ) => MutationResult;
  assignCourse: (courseId: string, teacherId: string) => MutationResult;
  saveGroup: (
    draft: Omit<LearningGroup, "id"> & { id?: string },
    actor?: DashboardRole,
  ) => MutationResult;
  linkGuardian: (parentId: string, studentId: string) => MutationResult;
  unlinkGuardian: (parentId: string, studentId: string) => void;
  getStudentCourses: (id: string) => LearningCourse[];
  getParentChildren: (parentId?: string) => DemoChild[];
  getTeacherCourses: (id: string) => PortalCourse[];
  resolveCourse: (id: string) => PortalCourse | undefined;
  threadsForRole: (role: ChatRole) => ChatThread[];
  isEntityActive: (kind: PreviewAccount["kind"], entityId: string) => boolean;
}
const Context = createContext<EnrollmentValue | null>(null);
export function EnrollmentPreviewProvider({
  children: content,
}: {
  children: ReactNode;
}) {
  const { can } = usePermissions();
  const [teacherProfiles, setTeacherProfiles] = useState<Record<string, TeacherProfileDraft>>({});
  const [teacherSubjects, setTeacherSubjects] = useState<
    Record<string, SubjectId>
  >(
    Object.fromEntries(
      teachers.map((teacher) => [teacher.id, teacher.subjectId]),
    ),
  );
  const [accounts, setAccounts] = useState(accountFixtures),
    [groups, setGroups] = useState(groupFixtures),
    [assignmentOverrides, setAssignments] = useState(courseAssignmentFixtures),
    [guardianLinks, setGuardianLinks] = useState(guardianLinkFixtures),
    [staffMembers, setStaffMembers] = useState(staffMemberFixtures);
  const [contentRecords, setContentRecords] = useState(contentFixtures);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const assignments = {
    ...Object.fromEntries(
      contentRecords.map((record) => [
        record.working.id,
        record.working.teacherId,
      ]),
    ),
    ...assignmentOverrides,
  };
  const catalogCourses = contentRecords.flatMap((record) =>
    record.published
      ? [
          {
            ...toPortalCourse(record.published),
            teacherId: assignments[record.working.id],
          },
        ]
      : [],
  );
  const historyCourses = contentRecords.flatMap((record) => {
    const snapshot = record.published ?? record.retired;
    return snapshot
      ? [
          {
            ...toPortalCourse(snapshot),
            teacherId: assignments[record.working.id],
          },
        ]
      : [];
  });
  const isEntityActive: EnrollmentValue["isEntityActive"] = (kind, id) =>
    accounts.some(
      (account) =>
        account.kind === kind &&
        account.entityId === id &&
        account.status === "نشط",
    );
  const emailUsed = (email: string, except?: string) =>
    [...accounts, ...staffMembers].some(
      (account) =>
        account.id !== except && account.email.toLowerCase() === email,
    );
  const validEmail = (email: string) =>
    email.length <= 254 && /^\S+@\S+\.\S+$/.test(email);
  const addAccount: EnrollmentValue["addAccount"] = (draft, actor) => {
    if (!can(actor, "page:users") || !can(actor, "users:create"))
      return { ok: false, error: "صلاحية إضافة المستخدم غير متاحة." };
    const labels = { student: "طالب", parent: "ولي أمر", teacher: "مدرس", admin: "إدارة" };
    const name = draft.name.trim();
    const email = draft.email.trim().toLowerCase();
    if (name.length < 2 || name.length > 160 || !validEmail(email) || !Object.hasOwn(labels, draft.kind))
      return { ok: false, error: "راجع الاسم والبريد والدور." };
    if (emailUsed(email)) return { ok: false, error: "البريد مستخدم بالفعل في المعاينة." };
    const profile = draft.teacherProfile;
    if (draft.kind === "teacher" && (!profile || !getSubject(profile.specialization)))
      return { ok: false, error: "كمّل الملف المهني للمدرس الأول." };
    const id = crypto.randomUUID();
    setAccounts((previous) => [...previous, {
      id, entityId: id, name, email, kind: draft.kind,
      role: labels[draft.kind], status: "بانتظار المراجعة",
    }]);
    if (draft.kind === "teacher" && profile) {
      setTeacherProfiles((previous) => ({ ...previous, [id]: profile }));
      setTeacherSubjects((previous) => ({ ...previous, [id]: profile.specialization }));
    }
    return { ok: true };
  };
  const updateAccount: EnrollmentValue["updateAccount"] = (id, draft, actor) => {
    const account = accounts.find((item) => item.id === id);
    if (!account)
      return { ok: false, error: "المستخدم غير موجود." };
    const name = draft.name.trim(),
      email = draft.email.trim().toLowerCase();
    if (!can(actor, "page:users") ||
      ((name !== account.name || email !== account.email.toLowerCase()) && !can(actor, "users:edit")) ||
      (draft.status !== account.status && !can(actor, "users:status")))
      return { ok: false, error: "صلاحية إجراء هذا التغيير غير متاحة." };
    if (
      name.length < 2 ||
      name.length > 160 ||
      !validEmail(email) ||
      !["نشط", "بانتظار المراجعة", "معطل"].includes(draft.status)
    )
      return { ok: false, error: "راجع الاسم والبريد وحالة المستخدم." };
    if (emailUsed(email, id))
      return { ok: false, error: "البريد مستخدم بالفعل في المعاينة." };
    setAccounts((previous) =>
      previous.map((account) =>
        account.id === id
          ? { ...account, name, email, status: draft.status }
          : account,
      ),
    );
    return { ok: true };
  };
  const addStaffMember: EnrollmentValue["addStaffMember"] = (draft) => {
    const name = draft.name.trim(),
      email = draft.email.trim().toLowerCase();
    if (
      name.length < 2 ||
      name.length > 80 ||
      !validEmail(email) ||
      !isStaffRole(draft.role)
    )
      return {
        ok: false,
        error: "اكتب اسمًا وبريدًا صالحين واختر دورًا إداريًا.",
      };
    if (emailUsed(email))
      return { ok: false, error: "البريد مستخدم بالفعل في المعاينة." };
    setStaffMembers((previous) => [
      ...previous,
      { ...draft, name, email, id: crypto.randomUUID() },
    ]);
    return { ok: true };
  };
  const assignCourse: EnrollmentValue["assignCourse"] = (
    courseId,
    teacherId,
  ) => {
    const course = catalogCourses.find((course) => course.id === courseId),
      teacher = getTeacher(teacherId);
    if (!course || !teacher || course.subjectId !== teacherSubjects[teacherId])
      return {
        ok: false,
        error: "مادة المقرر لازم تطابق المادة الوحيدة للمدرس.",
      };
    if (!isEntityActive("teacher", teacherId))
      return { ok: false, error: "اختر مدرسًا نشطًا." };
    setAssignments((previous) => ({ ...previous, [courseId]: teacherId }));
    return { ok: true };
  };
  const groupOpenForJoining = (group: LearningGroup) => group.active && Boolean(group.day && group.time) &&
    catalogCourses.some((course) => course.id === group.courseId) && isEntityActive("teacher", assignments[group.courseId]);
  const reserveSeat: EnrollmentValue["reserveSeat"] = (groupId) => {
    const group = groups.find(({ id }) => id === groupId);
    const now = Date.now();
    if (!group || !groupOpenForJoining(group) || !isEntityActive("student", previewStudentId))
      return { ok: false, error: "المجموعة أو حساب الطالب غير متاح للتسجيل حاليًا." };
    if (group.studentIds.includes(previewStudentId) || joinRequests.some((request) =>
      request.groupId === groupId && request.studentId === previewStudentId && holdsSeat(request, now)))
      return { ok: false, error: "عندك عضوية أو حجز بالفعل للمجموعة دي." };
    if (!availableSeats(group, joinRequests, now))
      return { ok: false, error: "المجموعة اكتملت أو آخر مكان فيها محجوز حاليًا." };
    const id = crypto.randomUUID();
    setJoinRequests((previous) => [...previous, {
      id, groupId, studentId: previewStudentId, fee: group.fee, expiresAt: now + reservationDuration, status: "reserved",
    }]);
    return { ok: true };
  };
  const payReservation: EnrollmentValue["payReservation"] = (id) => {
    const request = joinRequests.find((item) => item.id === id && item.studentId === previewStudentId);
    if (!request || request.status !== "reserved" || !holdsSeat(request, Date.now()))
      return { ok: false, error: "الحجز انتهى. احجز مرة تانية لو فيه مكان." };
    const group = groups.find((item) => item.id === request.groupId);
    if (!group || !groupOpenForJoining(group) || !isEntityActive("student", previewStudentId))
      return { ok: false, error: "المجموعة أو حساب الطالب غير متاح للدفع التجريبي." };
    setJoinRequests((previous) => previous.map((item) => item.id === id ? { ...item, status: "paid" } : item));
    return { ok: true };
  };
  const decideJoinRequest: EnrollmentValue["decideJoinRequest"] = (id, decision) => {
    if (!can("admin", "page:group-requests") || !can("admin", "groups:approve") || !isEntityActive("admin", "preview-admin"))
      return { ok: false, error: "صلاحية مراجعة الطلبات غير متاحة." };
    const request = joinRequests.find((item) => item.id === id && item.status === "paid");
    if (!request) return { ok: false, error: "الطلب مش بانتظار الموافقة بعد الدفع." };
    if (decision === "approved") {
      const group = groups.find((item) => item.id === request.groupId);
      if (!group || !groupOpenForJoining(group) || !isEntityActive("student", request.studentId))
        return { ok: false, error: "فعّل المجموعة وحساب الطالب قبل الموافقة." };
      if (!group.studentIds.includes(request.studentId) && group.studentIds.length >= group.capacity)
        return { ok: false, error: "المجموعة مكتملة. راجع السعة قبل الموافقة." };
      setGroups((previous) => previous.map((item) => item.id === group.id
        ? { ...item, studentIds: [...new Set([...item.studentIds, request.studentId])] } : item));
    }
    setJoinRequests((previous) => previous.map((item) => item.id === id ? { ...item, status: decision } : item));
    return { ok: true };
  };
  const saveGroup: EnrollmentValue["saveGroup"] = (draft, actor = "admin") => {
    if (!can(actor, "groups:manage") || !(can(actor, "page:group-requests") || can(actor, "page:enrollments")) ||
      (actor === "admin" ? !isEntityActive("admin", "preview-admin") : !staffMembers.some((member) => member.role === actor)))
      return { ok: false, error: "صلاحية إدارة المجموعات غير متاحة." };
    const name = draft.name.trim(),
      course = historyCourses.find((course) => course.id === draft.courseId);
    if (
      name.length < 2 ||
      name.length > 160 ||
      !course ||
      typeof draft.active !== "boolean"
    )
      return { ok: false, error: "اكتب اسم المجموعة واختر مقررًا صحيحًا." };
    if (draft.id && !groups.some((group) => group.id === draft.id))
      return { ok: false, error: "المجموعة غير موجودة." };
    if (draft.active && !isEntityActive("teacher", assignments[course.id]))
      return {
        ok: false,
        error: "مدرس المقرر غير نشط. فعّله أو أعد إسناد المقرر أولًا.",
      };
    const studentIds = [...new Set(draft.studentIds)];
    const previous = groups.find((group) => group.id === draft.id);
    const held = joinRequests.filter((request) => request.groupId === draft.id && holdsSeat(request, Date.now()));
    if (!Number.isInteger(draft.capacity) || draft.capacity < 1 || draft.capacity > 500 ||
      new Set([...studentIds, ...held.map((request) => request.studentId)]).size > draft.capacity)
      return { ok: false, error: "السعة من 1 إلى 500 ولازم تكفي الأعضاء والأماكن المحجوزة." };
    if (previous && held.length && (draft.courseId !== previous.courseId || !draft.active))
      return { ok: false, error: "راجع الحجوزات الحالية قبل تعطيل المجموعة أو تغيير المقرر." };
    if (held.some((request) => studentIds.includes(request.studentId) && !previous?.studentIds.includes(request.studentId)))
      return { ok: false, error: "راجع طلب انضمام الطالب بدل إضافته يدويًا أثناء الحجز." };
    if (!Number.isSafeInteger(draft.fee) || draft.fee < 0 || draft.fee > 99999999 ||
      (draft.day && !Object.hasOwn(groupDays, draft.day)) ||
      (draft.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time)) || Boolean(draft.day) !== Boolean(draft.time))
      return { ok: false, error: "راجع السعر واليوم والساعة. حدد اليوم والوقت مع بعض لعرض المجموعة." };
    if (
      !catalogCourses.some((item) => item.id === draft.courseId) &&
      (!previous ||
        previous.courseId !== draft.courseId ||
        draft.active ||
        studentIds.some((id) => !previous.studentIds.includes(id)))
    )
      return {
        ok: false,
        error: "المقرر غير منشور. يمكن تعطيل مجموعته فقط دون إضافة طلاب.",
      };
    if (
      studentIds.some(
        (id) =>
          !studentFixtures.some((student) => student.id === id) ||
          (!isEntityActive("student", id) &&
            !(
              previous?.courseId === draft.courseId &&
              previous.studentIds.includes(id)
            )),
      )
    )
      return {
        ok: false,
        error: "الإضافة للمجموعات متاحة للطلاب النشطين فقط.",
      };
    const group: LearningGroup = {
      id: draft.id ?? crypto.randomUUID(),
      name,
      courseId: course.id,
      studentIds,
      active: draft.active,
      capacity: draft.capacity,
      fee: draft.fee,
      day: draft.day,
      time: draft.time,
    };
    setGroups((previous) =>
      draft.id
        ? previous.map((item) => (item.id === draft.id ? group : item))
        : [...previous, group],
    );
    return { ok: true };
  };
  const linkGuardian: EnrollmentValue["linkGuardian"] = (
    parentId,
    studentId,
  ) => {
    if (
      !accounts.some(
        (account) =>
          account.id === parentId &&
          account.kind === "parent" &&
          account.status === "نشط",
      ) ||
      !isEntityActive("student", studentId)
    )
      return { ok: false, error: "اختر ولي أمر وطالبًا نشطين." };
    if (
      guardianLinks.some(
        (link) => link.parentId === parentId && link.studentId === studentId,
      )
    )
      return { ok: false, error: "الطالب مرتبط بولي الأمر بالفعل." };
    setGuardianLinks((previous) => [...previous, { parentId, studentId }]);
    return { ok: true };
  };
  const unlinkGuardian: EnrollmentValue["unlinkGuardian"] = (
    parentId,
    studentId,
  ) =>
    setGuardianLinks((previous) =>
      previous.filter(
        (link) => !(link.parentId === parentId && link.studentId === studentId),
      ),
    );
  const resolveCourse: EnrollmentValue["resolveCourse"] = (id) => {
    const course = historyCourses.find((course) => course.id === id);
    return course
      ? { ...course, teacherId: assignments[id] ?? course.teacherId }
      : undefined;
  };
  const getStudentCourses: EnrollmentValue["getStudentCourses"] = (id) => {
    const ids = [
      ...new Set(
        groups
          .filter((group) => group.active && group.studentIds.includes(id))
          .map((group) => group.courseId),
      ),
    ];
    return ids.flatMap((courseId) => {
      const course = resolveCourse(courseId);
      if (!course) return [];
      const existing = children
        .find((child) => child.id === id)
        ?.courses.find((entry) => entry.courseId === courseId);
      return [
        {
          courseId,
          completed: Math.min(
            existing?.completed ?? 0,
            course.units.reduce((sum, unit) => sum + unit.lessons.length, 0),
          ),
          total: course.units.reduce(
            (sum, unit) => sum + unit.lessons.length,
            0,
          ),
          nextLesson:
            (course.units.some((unit) =>
              unit.lessons.some(
                (lesson) => lesson.title === existing?.nextLesson,
              ),
            )
              ? existing?.nextLesson
              : undefined) ??
            course.units[0]?.lessons[0]?.title ??
            course.title,
        },
      ];
    });
  };
  const getParentChildren: EnrollmentValue["getParentChildren"] = (
    parentId = "u4",
  ) =>
    guardianLinks
      .filter((link) => link.parentId === parentId)
      .flatMap((link) => {
        const student = studentFixtures.find(
            (item) => item.id === link.studentId,
          ),
          account = accounts.find(
            (item) =>
              item.entityId === link.studentId && item.kind === "student",
          );
        if (!student || !account) return [];
        const original = children.find((child) => child.id === student.id),
          entries = getStudentCourses(student.id);
        return [
          {
            id: student.id,
            name: account.name,
            initials: account.name
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join(" "),
            grade: getGrade(student.gradeId)?.name ?? "",
            courses: entries,
            activity:
              original?.activity ??
              weeklyActivity.map((day) => ({ ...day, minutes: 0 })),
            completed: entries.reduce((sum, entry) => sum + entry.completed, 0),
            goal: original?.goal ?? 180,
          },
        ];
      });
  const getTeacherCourses: EnrollmentValue["getTeacherCourses"] = (id) =>
    catalogCourses
      .filter((course) => assignments[course.id] === id)
      .map((course) => resolveCourse(course.id)!);
  const saveTeacherSubject: EnrollmentValue["saveTeacherSubject"] = (
    teacherId,
    subjectId,
  ) => {
    if (!getSubject(subjectId))
      return { ok: false, error: "المادة غير موجودة." };
    const error = teacherSubjectConflict(
      teacherId,
      subjectId,
      getTeacherCourses(teacherId),
    );
    if (error) return { ok: false, error };
    setTeacherSubjects((previous) => ({ ...previous, [teacherId]: subjectId }));
    return { ok: true };
  };
  const threadsForRole: EnrollmentValue["threadsForRole"] = (role) => {
    if (role !== "student" && role !== "teacher") return [];
    return studentFixtures
      .flatMap((student) => {
        if (!isEntityActive("student", student.id)) return [];
        const teachers = new Map<string, string[]>();
        for (const entry of getStudentCourses(student.id)) {
          const teacherId = assignments[entry.courseId];
          if (isEntityActive("teacher", teacherId))
            teachers.set(teacherId, [
              ...(teachers.get(teacherId) ?? []),
              entry.courseId,
            ]);
        }
        return [...teachers].map(([teacherId, courseIds]) => ({
          id: `${student.id}:${teacherId}`,
          studentId: student.id,
          teacherId,
          courseIds,
        }));
      })
      .filter((thread) =>
        role === "student"
          ? thread.studentId === previewStudentId
          : thread.teacherId === previewTeacherId,
      );
  };
  return (
    <Context.Provider
      value={{
        contentRecords,
        setContentRecords,
        catalogCourses,
        teacherSubjects,
        teacherProfiles,
        saveTeacherSubject,
        accounts,
        groups,
        joinRequests,
        reserveSeat,
        payReservation,
        decideJoinRequest,
        assignments,
        guardianLinks,
        staffMembers,
        addStaffMember,
        updateAccount,
        addAccount,
        assignCourse,
        saveGroup,
        linkGuardian,
        unlinkGuardian,
        getStudentCourses,
        getParentChildren,
        getTeacherCourses,
        resolveCourse,
        threadsForRole,
        isEntityActive,
      }}
    >
      {content}
    </Context.Provider>
  );
}
export function useEnrollmentPreview() {
  const context = useContext(Context);
  if (!context) throw new Error("EnrollmentPreviewProvider is required");
  return context;
}
