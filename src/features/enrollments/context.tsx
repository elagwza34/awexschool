"use client";
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

interface EnrollmentValue {
  contentRecords: ContentRecord[];
  setContentRecords: Dispatch<SetStateAction<ContentRecord[]>>;
  catalogCourses: PortalCourse[];
  teacherSubjects: Record<string, SubjectId>;
  saveTeacherSubject: (
    teacherId: string,
    subjectId: SubjectId,
  ) => MutationResult;
  accounts: PreviewAccount[];
  groups: LearningGroup[];
  assignments: Record<string, string>;
  guardianLinks: GuardianLink[];
  staffMembers: StaffMember[];
  addStaffMember: (draft: Omit<StaffMember, "id">) => MutationResult;
  updateAccount: (
    id: string,
    draft: Pick<PreviewAccount, "name" | "email" | "status">,
  ) => MutationResult;
  assignCourse: (courseId: string, teacherId: string) => MutationResult;
  saveGroup: (
    draft: Omit<LearningGroup, "id"> & { id?: string },
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
  const updateAccount: EnrollmentValue["updateAccount"] = (id, draft) => {
    if (!accounts.some((account) => account.id === id))
      return { ok: false, error: "المستخدم غير موجود." };
    const name = draft.name.trim(),
      email = draft.email.trim().toLowerCase();
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
  const saveGroup: EnrollmentValue["saveGroup"] = (draft) => {
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
        saveTeacherSubject,
        accounts,
        groups,
        assignments,
        guardianLinks,
        staffMembers,
        addStaffMember,
        updateAccount,
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
