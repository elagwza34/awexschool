"use client";
import { portalCourseHref } from "@/features/content/routes";
import { useState } from "react";
import Link from "next/link";
import { teachers, getTeacher, getGrade } from "@/features/catalog/mock-data";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Panel } from "@/features/dashboards/dashboard-panels";
import {
  previewStudentId,
  previewTeacherId,
} from "@/features/dashboards/chat-data";
import { useEnrollmentPreview } from "./context";
import { studentFixtures, type LearningGroup } from "./data";

function GroupEditor({ group }: { group?: LearningGroup }) {
  const {
    catalogCourses: courses,
    resolveCourse,
    accounts,
    assignments,
    saveGroup,
  } = useEnrollmentPreview();
  const [open, setOpen] = useState(false),
    [courseId, setCourseId] = useState(group?.courseId ?? courses[0]?.id ?? ""),
    [studentIds, setStudentIds] = useState(group?.studentIds ?? []),
    [error, setError] = useState("");
  const teacher = accounts.find(
    (account) =>
      account.kind === "teacher" && account.entityId === assignments[courseId],
  );
  const retiredCourse =
    group && !courses.some((course) => course.id === group.courseId)
      ? resolveCourse(group.courseId)
      : undefined;
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        setError("");
        if (value) {
          setCourseId(group?.courseId ?? courses[0]?.id ?? "");
          setStudentIds(group?.studentIds ?? []);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant={group ? "outline" : "default"}
          size={group ? "sm" : "default"}
          aria-label={group ? `تعديل مجموعة ${group.name}` : undefined}
        >
          {group ? "تعديل المجموعة" : "إنشاء مجموعة"}
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{group ? "تعديل المجموعة" : "إنشاء مجموعة"}</DialogTitle>
          <DialogDescription>
            مجموعة محلية تجريبية. المدرس يُحدد من إسناد المقرر؛ تغيير الإسناد
            ينعكس على كل مجموعاته.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const result = saveGroup({
              id: group?.id,
              name: String(form.get("name")),
              courseId,
              studentIds,
              active: form.get("active") === "on",
            });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setOpen(false);
          }}
        >
          <div>
            <label
              htmlFor="group-name"
              className="mb-2 block text-sm font-semibold"
            >
              اسم المجموعة
            </label>
            <input
              id="group-name"
              name="name"
              className="field"
              defaultValue={group?.name ?? ""}
              required
              minLength={2}
              maxLength={160}
            />
          </div>
          <div>
            <label
              htmlFor="group-course"
              className="mb-2 block text-sm font-semibold"
            >
              مقرر المجموعة
            </label>
            <select
              id="group-course"
              className="field"
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
            >
              <option value="" disabled>
                اختر مقررًا منشورًا
              </option>
              {retiredCourse && (
                <option value={retiredCourse.id} disabled>
                  {retiredCourse.title} · النشر موقوف
                </option>
              )}
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title} · {getGrade(course.gradeId)?.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm">
            المدرس المسند: {teacher?.name ?? "غير محدد"} · {teacher?.status}
          </p>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold">
              طلاب المجموعة
            </legend>
            {studentFixtures.map((student) => {
              const account = accounts.find(
                (item) => item.id === student.accountId,
              )!;
              return (
                <label
                  key={student.id}
                  className="flex min-h-11 items-center gap-2 rounded-md border p-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={studentIds.includes(student.id)}
                    disabled={
                      account.status !== "نشط" &&
                      !group?.studentIds.includes(student.id)
                    }
                    onChange={(event) =>
                      setStudentIds((previous) =>
                        event.target.checked
                          ? [...previous, student.id]
                          : previous.filter((id) => id !== student.id),
                      )
                    }
                  />
                  {account.name} · {getGrade(student.gradeId)?.name} ·{" "}
                  {account.status}
                </label>
              );
            })}
          </fieldset>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              name="active"
              type="checkbox"
              defaultChecked={group?.active ?? true}
            />
            المجموعة مفعّلة في المعاينة
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit">حفظ المجموعة في المعاينة</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CourseAssignments() {
  const {
    catalogCourses: courses,
    accounts,
    assignments,
    assignCourse,
    teacherSubjects,
  } = useEnrollmentPreview();
  const [selectedCourseId, setCourseId] = useState(courses[0]?.id ?? ""),
    [teacherId, setTeacherId] = useState(
      assignments[courses[0]?.id ?? ""] ?? "",
    ),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const course =
    courses.find((item) => item.id === selectedCourseId) ?? courses[0];
  const courseId = course?.id ?? "";
  if (!course)
    return (
      <Panel title="المقررات">
        <p role="status">لا توجد مقررات منشورة للإسناد حاليًا.</p>
      </Panel>
    );
  return (
    <Panel
      title="إسناد المقررات"
      subtitle="كل مدرس له مادة واحدة، والمادة يمكن أن يدرّسها أكثر من مدرس. الإسناد هنا للمقرر ومجموعاته داخل المعاينة."
    >
      <form
        className="grid items-end gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const result = assignCourse(courseId, teacherId);
          setError(result.ok ? "" : result.error);
          setMessage(
            result.ok ? "تم تحديث إسناد المقرر وكل مجموعاته في المعاينة." : "",
          );
        }}
      >
        <div>
          <label
            htmlFor="assignment-course"
            className="mb-2 block text-sm font-semibold"
          >
            المقرر المراد إسناده
          </label>
          <select
            id="assignment-course"
            className="field"
            value={courseId}
            onChange={(event) => {
              const id = event.target.value;
              setCourseId(id);
              setTeacherId(assignments[id]);
              setMessage("");
              setError("");
            }}
          >
            {courses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="assignment-teacher"
            className="mb-2 block text-sm font-semibold"
          >
            مدرس المادة
          </label>
          <select
            id="assignment-teacher"
            className="field"
            value={teacherId}
            onChange={(event) => {
              setTeacherId(event.target.value);
              setMessage("");
              setError("");
            }}
          >
            {teachers
              .filter((item) => teacherSubjects[item.id] === course.subjectId)
              .map((item) => {
                const account = accounts.find(
                  (account) =>
                    account.kind === "teacher" && account.entityId === item.id,
                );
                return (
                  <option
                    key={item.id}
                    value={item.id}
                    disabled={account?.status !== "نشط"}
                  >
                    {account?.name ?? item.name} · {account?.status}
                  </option>
                );
              })}
          </select>
        </div>
        <Button type="submit" className="sm:col-span-2 sm:justify-self-start">
          حفظ إسناد المقرر
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm text-primary">
          {message}
        </p>
      )}
      <ul className="mt-5 divide-y rounded-lg border">
        {courses.map((item) => (
          <li key={item.id} className="grid gap-2 p-3 text-sm sm:grid-cols-2">
            <span>{item.title}</span>
            <span>
              {
                accounts.find(
                  (account) =>
                    account.entityId === assignments[item.id] &&
                    account.kind === "teacher",
                )?.name
              }
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function GuardianLinks() {
  const { accounts, guardianLinks, linkGuardian, unlinkGuardian } =
    useEnrollmentPreview();
  const parents = accounts.filter((item) => item.kind === "parent"),
    students = accounts.filter((item) => item.kind === "student");
  const [parentId, setParentId] = useState(parents[0]?.id ?? ""),
    [studentId, setStudentId] = useState(students[0]?.entityId ?? ""),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  return (
    <Panel
      title="ربط أولياء الأمور بالطلاب"
      subtitle="الربط يحدد الأبناء الظاهرين في لوحة ولي الأمر. فك الربط لا يحذف الطالب أو مقرراته."
    >
      <form
        className="grid items-end gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const result = linkGuardian(parentId, studentId);
          setError(result.ok ? "" : result.error);
          setMessage(result.ok ? "تم ربط الطالب بولي الأمر في المعاينة." : "");
        }}
      >
        <div>
          <label
            htmlFor="guardian-parent"
            className="mb-2 block text-sm font-semibold"
          >
            ولي الأمر
          </label>
          <select
            id="guardian-parent"
            className="field"
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
          >
            {parents.map((item) => (
              <option
                key={item.id}
                value={item.id}
                disabled={item.status !== "نشط"}
              >
                {item.name} · {item.status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="guardian-student"
            className="mb-2 block text-sm font-semibold"
          >
            الطالب المرتبط
          </label>
          <select
            id="guardian-student"
            className="field"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
          >
            {students.map((item) => (
              <option
                key={item.id}
                value={item.entityId}
                disabled={item.status !== "نشط"}
              >
                {item.name} · {item.status}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">ربط الطالب بولي الأمر</Button>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm text-primary">
          {message}
        </p>
      )}
      <ul className="mt-4 divide-y rounded-lg border">
        {guardianLinks.map((link) => {
          const parent = accounts.find((item) => item.id === link.parentId),
            student = students.find((item) => item.entityId === link.studentId);
          return (
            <li
              key={`${link.parentId}:${link.studentId}`}
              className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
            >
              <span>
                {parent?.name} · {student?.name}
              </span>
              <Button
                variant="outline"
                size="sm"
                aria-label={`فك ربط ${student?.name} من ${parent?.name}`}
                onClick={() => {
                  unlinkGuardian(link.parentId, link.studentId);
                  setMessage("تم فك الربط في المعاينة.");
                  setError("");
                }}
              >
                فك الربط
              </Button>
            </li>
          );
        })}
      </ul>
      {!guardianLinks.length && (
        <p role="status" className="py-4 text-sm">
          لا توجد روابط بين أولياء الأمور والطلاب.
        </p>
      )}
    </Panel>
  );
}

export function AdminEnrollments() {
  const { groups, accounts, assignments } = useEnrollmentPreview();
  const [query, setQuery] = useState("");
  const visible = groups.filter((group) => group.name.includes(query.trim()));
  return (
    <Tabs defaultValue="groups" dir="rtl">
      <TabsList className="mb-4 grid w-full grid-cols-3">
        <TabsTrigger value="groups">المجموعات</TabsTrigger>
        <TabsTrigger value="assignments">إسناد المقررات</TabsTrigger>
        <TabsTrigger value="guardians">ربط أولياء الأمور</TabsTrigger>
      </TabsList>
      <TabsContent value="groups">
        <Panel
          title="المجموعات التعليمية"
          subtitle="المجموعات والعضويات مشتركة بين اللوحات، وتُعاد للوضع النموذجي بعد تحديث الصفحة."
          action={<GroupEditor />}
        >
          <label
            htmlFor="group-search"
            className="mb-2 block text-sm font-semibold"
          >
            البحث في المجموعات
          </label>
          <input
            id="group-search"
            className="field mb-4"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="divide-y rounded-lg border">
            {visible.map((group) => (
              <article
                key={group.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3"
              >
                <div>
                  <h3 className="text-sm font-semibold">{group.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {
                      accounts.find(
                        (item) =>
                          item.entityId === assignments[group.courseId] &&
                          item.kind === "teacher",
                      )?.name
                    }{" "}
                    · {group.studentIds.length} طلاب ·{" "}
                    {group.active ? "مفعّلة" : "متوقفة"}
                  </p>
                </div>
                <GroupEditor group={group} />
              </article>
            ))}
          </div>
          {!visible.length && (
            <p role="status" className="py-4 text-sm">
              لا توجد مجموعات مطابقة.
            </p>
          )}
        </Panel>
      </TabsContent>
      <TabsContent value="assignments">
        <CourseAssignments />
      </TabsContent>
      <TabsContent value="guardians">
        <GuardianLinks />
      </TabsContent>
    </Tabs>
  );
}

export function TeacherGroups() {
  const { groups, assignments, accounts } = useEnrollmentPreview();
  const visible = groups.filter(
    (group) => group.active && assignments[group.courseId] === previewTeacherId,
  );
  return (
    <Panel
      title="مجموعاتي وطلابي"
      subtitle="قائمة مشتقة من إسنادات الأدمن. الإدارة هي التي تعدّل الإسناد والعضويات في هذه المعاينة."
    >
      <div className="space-y-3">
        {visible.map((group) => (
          <article key={group.id} className="rounded-lg border p-3">
            <h3 className="font-semibold">{group.name}</h3>
            <Link
              href={portalCourseHref("teacher", group.courseId)}
              className="inline-flex min-h-11 items-center text-sm text-primary"
            >
              معاينة المقرر
            </Link>
            <ul className="space-y-2">
              {group.studentIds.map((id) => {
                const student = accounts.find(
                  (account) =>
                    account.kind === "student" && account.entityId === id,
                );
                return (
                  <li key={id} className="text-sm">
                    {student?.name} · {student?.status}
                  </li>
                );
              })}
            </ul>
            {!group.studentIds.length && (
              <p className="text-sm text-muted-foreground">
                لا يوجد طلاب في المجموعة بعد.
              </p>
            )}
          </article>
        ))}
      </div>
      {!visible.length && (
        <p role="status" className="py-4 text-sm">
          لا توجد مجموعات مسندة إليك حاليًا.
        </p>
      )}
    </Panel>
  );
}

export function StudentGroupsSummary({
  studentId = previewStudentId,
}: {
  studentId?: string;
}) {
  const { groups, assignments, accounts } = useEnrollmentPreview();
  const visible = groups.filter(
    (group) => group.active && group.studentIds.includes(studentId),
  );
  return (
    <Panel
      title="المجموعات المرتبطة بالطالب"
      subtitle="المدرس والمقرر يتحددان من الإسناد الحالي في المعاينة."
    >
      <ul className="divide-y">
        {visible.map((group) => (
          <li key={group.id} className="py-3 text-sm">
            <p className="font-semibold">{group.name}</p>
            <p className="mt-1 text-muted-foreground">
              {accounts.find(
                (account) =>
                  account.kind === "teacher" &&
                  account.entityId === assignments[group.courseId],
              )?.name ?? getTeacher(assignments[group.courseId])?.name}
            </p>
          </li>
        ))}
      </ul>
      {!visible.length && (
        <p role="status" className="py-3 text-sm">
          لا توجد مجموعات مرتبطة بالطالب حاليًا.
        </p>
      )}
    </Panel>
  );
}
