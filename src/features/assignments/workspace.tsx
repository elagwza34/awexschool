"use client";
import { usePermissions } from "@/features/dashboards/permissions-context";
import { cloneElement, useId, useState, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/shared";
import { Panel } from "@/features/dashboards/dashboard-panels";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import { usePortalPreview } from "@/features/dashboards/preview-context";
import {
  previewStudentId,
  previewTeacherId,
} from "@/features/dashboards/chat-data";
import { ParentChildPicker } from "@/features/dashboards/parent-child-picker";
import { useParentSelection } from "@/features/dashboards/interactive-workspaces";
import { useAssignments } from "./context";
import { cairoDate, submissionState } from "./logic";
import type { Assignment, Submission, Result } from "./types";

function Field({ label, children }: { label: string; children: ReactElement<{ id?: string }> }) {
  const generatedId = useId();
  const id = children.props.id ?? generatedId;
  return (
    <div className="grid gap-1 text-sm font-semibold">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
function Feedback({ result }: { result?: Result }) {
  return result ? (
    <p className="text-sm leading-7" role={result.ok ? "status" : "alert"}>
      {result.ok ? "تم الحفظ في المعاينة المؤقتة." : result.error}
    </p>
  ) : null;
}
function AssignmentCreator() {
  const registry = useEnrollmentPreview();
  const { sessions } = usePortalPreview();
  const { create } = useAssignments();
  const groups = registry.groups.filter(
    (g) => g.active && registry.assignments[g.courseId] === previewTeacherId && registry.catalogCourses.some(c => c.id === g.courseId),
  );
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [sessionId, setSessionId] = useState("");
  const [title, setTitle] = useState(""),
    [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState(""),
    [maxScore, setMaxScore] = useState("10");
  const [result, setResult] = useState<Result>();
  const active = registry.isEntityActive("teacher", previewTeacherId);
  return (
    <Panel
      title="إنشاء واجب"
      subtitle="إجابة نصية فقط. موعد التسليم حتى نهاية اليوم بتوقيت القاهرة؛ يُقبل التسليم المتأخر مع توضيح حالته."
    >
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const next = create({
            title,
            instructions,
            groupId,
            sessionId: sessionId || undefined,
            dueDate,
            maxScore: Number(maxScore),
          });
          setResult(next);
          if (next.ok) {
            setTitle("");
            setInstructions("");
          }
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="عنوان الواجب">
            <input
              className="field"
              required
              minLength={3}
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="مجموعة الواجب">
            <select
              className="field"
              required
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value);
                setSessionId("");
              }}
            >
              <option value="">اختر المجموعة</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="حصة مرتبطة (اختياري)">
            <select
              className="field"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
            >
              <option value="">بدون حصة</option>
              {sessions
                .filter(
                  (s) =>
                    s.groupId === groupId &&
                    s.teacherId === previewTeacherId &&
                    s.status !== "cancelled",
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} · {s.date}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="آخر يوم للتسليم">
            <input
              type="date"
              className="field"
              min={cairoDate()}
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
          <Field label="الدرجة النهائية">
            <input
              type="number"
              className="field"
              min={1}
              max={1000}
              step={1}
              required
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
            />
          </Field>
        </div>
        <Field label="تعليمات الواجب">
          <textarea
            className="field min-h-28"
            required
            minLength={5}
            maxLength={5000}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </Field>
        <p className="text-xs leading-7 text-muted-foreground">
          الواجب المنشور ثابت في هذه المعاينة. تعديل المجموعة لاحقًا لا يغيّر
          قائمة مستلميه. إلغاء الحصة المرتبطة لا يلغي الواجب.
        </p>
        <Feedback result={result} />
        <Button
          type="submit"
          className="justify-self-start"
          disabled={!active || !groups.length}
        >
          نشر الواجب التجريبي
        </Button>
        {(!active || !groups.length) && (
          <p role="status" className="text-sm">
            يلزم حساب مدرس نشط ومجموعة مفعلة للنشر.
          </p>
        )}
      </form>
    </Panel>
  );
}
function StudentAnswer({
  assignment,
  submission,
}: {
  assignment: Assignment;
  submission?: Submission;
}) {
  const { submit } = useAssignments();
  const { isEntityActive } = useEnrollmentPreview();
  const [answer, setAnswer] = useState(submission?.answer ?? ""),
    [result, setResult] = useState<Result>();
  if (submission?.score !== undefined) return null;
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setResult(submit(assignment.id, answer));
      }}
    >
      <Field label="إجابتك">
        <textarea
          className="field min-h-28"
          required
          maxLength={10000}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
      </Field>
      <p className="text-xs leading-7 text-muted-foreground">
        يمكن استبدال الإجابة حتى تصحيحها. آخر تسليم هو المعتمد، ويُحدد التأخير
        حسب وقته. لا يوجد رفع ملفات فعلي.
      </p>
      <Feedback result={result} />
      <Button
        className="justify-self-start"
        type="submit"
        disabled={!isEntityActive("student", previewStudentId)}
      >
        {submission ? "تحديث الإجابة" : "تسليم الإجابة"}
      </Button>
    </form>
  );
}
function GradeForm({
  assignment,
  submission,
  role,
}: {
  assignment: Assignment;
  submission: Submission;
  role: "admin" | "teacher";
}) {
  const { grade } = useAssignments();
  const { isEntityActive } = useEnrollmentPreview();
  const [score, setScore] = useState(submission.score?.toString() ?? ""),
    [feedback, setFeedback] = useState(submission.feedback ?? ""),
    [result, setResult] = useState<Result>();
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setResult(
          grade(
            assignment.id,
            submission.studentId,
            score.trim() ? Number(score) : NaN,
            feedback,
            role,
          ),
        );
      }}
    >
      <Field label="درجة الطالب">
        <input
          className="field"
          type="number"
          step="any"
          min={0}
          max={assignment.maxScore}
          required
          value={score}
          onChange={(e) => setScore(e.target.value)}
        />
      </Field>
      <Field label="ملاحظات التصحيح">
        <textarea
          className="field"
          required
          minLength={3}
          maxLength={2000}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
      </Field>
      <Feedback result={result} />
      <Button
        type="submit"
        className="justify-self-start"
        disabled={role === "admin"
          ? !isEntityActive("admin", "preview-admin")
          : !isEntityActive("teacher", previewTeacherId)}
      >
        حفظ التصحيح
      </Button>
    </form>
  );
}
function AssignmentCard({
  assignment,
  role,
  learnerId,
}: {
  assignment: Assignment;
  role: Role;
  learnerId?: string;
}) {
  const { submissions } = useAssignments();
  const { can } = usePermissions();
  const { accounts } = useEnrollmentPreview();
  const { sessions } = usePortalPreview();
  const own = submissions.find(
    (s) => s.assignmentId === assignment.id && s.studentId === learnerId,
  );
  const reviews = role === "teacher" || role === "admin";
  const roster = reviews ? assignment.studentIds : learnerId ? [learnerId] : [];
  const count = submissions.filter(
    (s) => s.assignmentId === assignment.id,
  ).length;
  return (
    <article
      className="min-w-0 space-y-3 rounded-lg border bg-card p-3 sm:p-4"
      data-assignment-id={assignment.id}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold break-words">{assignment.title}</h3>
        <Badge>
          {reviews
            ? `${count} / ${assignment.studentIds.length} تسليم`
            : submissionState(assignment, own)}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground break-words">
        {assignment.groupName} · {assignment.teacherName}
      </p>
      <p className="text-sm">
        التسليم حتى {assignment.dueDate} · الدرجة النهائية:{" "}
        {assignment.maxScore}
      </p>
      {assignment.sessionId && (
        <p className="text-sm text-muted-foreground">
          الحصة: {assignment.sessionTitle}
          {sessions.find((s) => s.id === assignment.sessionId)?.status ===
          "cancelled"
            ? " (ملغاة؛ الواجب ما زال متاحًا)"
            : ""}
        </p>
      )}
      <p className="whitespace-pre-wrap break-words text-sm leading-7">
        {assignment.instructions}
      </p>
      {roster.map((studentId) => {
        const submission = submissions.find(
          (s) => s.assignmentId === assignment.id && s.studentId === studentId,
        );
        const name =
          accounts.find((a) => a.kind === "student" && a.entityId === studentId)
            ?.name ?? "طالب";
        return (
          <details
            key={studentId}
            className="rounded-md border p-3"
            open={!reviews}
          >
            <summary className="min-h-11 cursor-pointer text-sm font-semibold leading-7">
              {reviews ? name : "التسليم والنتيجة"} ·{" "}
              {submissionState(assignment, submission)}
            </summary>
            <div className="grid gap-3 pt-2">
              {!submission && (
                <p className="text-sm text-muted-foreground">
                  لم تُرسل إجابة بعد؛ لا توجد درجة مسجلة.
                </p>
              )}
              {submission && (
                <>
                  <p className="text-xs text-muted-foreground">
                    وقت التسليم:{" "}
                    {new Intl.DateTimeFormat("ar-EG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Africa/Cairo",
                    }).format(new Date(submission.submittedAt))}{" "}
                    · القاهرة
                    {cairoDate(new Date(submission.submittedAt)) >
                    assignment.dueDate
                      ? " · متأخر"
                      : ""}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm leading-7">
                    {submission.answer}
                  </p>
                  {submission.score !== undefined && (
                    <>
                      <p className="text-sm font-bold">
                        الدرجة: {submission.score} / {assignment.maxScore}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-sm leading-7">
                        ملاحظات المدرس: {submission.feedback}
                      </p>
                    </>
                  )}
                </>
              )}
              {(role === "teacher" || role === "admin") && submission && can(role, "assignments:grade") && (
                <GradeForm assignment={assignment} submission={submission} role={role} />
              )}
            </div>
          </details>
        );
      })}
      {role === "student" && can(role, "assignments:submit") && (
        <StudentAnswer assignment={assignment} submission={own} />
      )}
    </article>
  );
}
type Role = "teacher" | "student" | "parent" | "admin";
function Records({ role, learnerId }: { role: Role; learnerId?: string }) {
  const { assignments, submissions } = useAssignments();
  const [teacher, setTeacher] = useState(""),
    [group, setGroup] = useState(""),
    [status, setStatus] = useState("");
  const id = useId();
  const eligible = assignments.filter(
    (a) =>
      role === "admin" ||
      (role === "teacher"
        ? a.teacherId === previewTeacherId
        : !!learnerId && a.studentIds.includes(learnerId)),
  );
  const matchesStatus = (a: Assignment) => {
    const students =
      role === "admin" || role === "teacher"
        ? a.studentIds
        : learnerId
          ? [learnerId]
          : [];
    return (
      !status ||
      students.some(
        (studentId) =>
          submissionState(
            a,
            submissions.find(
              (s) => s.assignmentId === a.id && s.studentId === studentId,
            ),
          ) === status,
      )
    );
  };
  const visible = eligible.filter(
    (a) =>
      (!teacher || a.teacherId === teacher) &&
      (!group || a.groupId === group) &&
      matchesStatus(a),
  );
  return (
    <Panel
      title="قائمة الواجبات"
      subtitle="بيانات مؤقتة؛ لا تُنشأ درجات تلقائية لغير المسلّمين. فلاتر الحالة تعرض الواجب إذا طابقت حالة أحد طلابه."
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {role === "admin" && (
          <Field label="مدرس الواجب">
            <select
              id={`${id}-teacher`}
              className="field"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
            >
              <option value="">كل المدرسين</option>
              {[
                ...new Map(
                  eligible.map((a) => [a.teacherId, a.teacherName]),
                ).entries(),
              ].map(([value, name]) => (
                <option key={value} value={value}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="تصفية مجموعة الواجب">
          <select
            className="field"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option value="">كل المجموعات</option>
            {[
              ...new Map(
                eligible.map((a) => [a.groupId, a.groupName]),
              ).entries(),
            ].map(([value, name]) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="حالة التسليم">
          <select
            className="field"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">كل الحالات</option>
            {["لم يُسلّم", "بانتظار التصحيح", "تسليم متأخر", "تم التصحيح"].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </Field>
      </div>
      <div className="grid gap-4">
        {visible.map((a) => (
          <AssignmentCard
            key={a.id}
            assignment={a}
            role={role}
            learnerId={learnerId}
          />
        ))}
      </div>
      {!visible.length && (
        eligible.length ? (
          <div className="space-y-3">
            <EmptyState title="لا توجد واجبات مطابقة للتصفية" />
            <Button variant="outline" onClick={() => {
              setTeacher("");
              setGroup("");
              setStatus("");
            }}>مسح التصفية</Button>
          </div>
        ) : <EmptyState title="لا توجد واجبات هنا لسه" />
      )}
    </Panel>
  );
}
function ParentRecords() {
  const registry = useEnrollmentPreview();
  const selection = useParentSelection();
  const children = registry.getParentChildren();
  const child = children.find((c) => c.id === selection.childId) ?? children[0];
  return child ? (
    <>
      <ParentChildPicker
        wards={children}
        selectedId={child.id}
        onSelect={selection.setChildId}
      />
      <Records key={child.id} role="parent" learnerId={child.id} />
    </>
  ) : (
    <EmptyState title="لا يوجد أبناء مرتبطون بولي الأمر" />
  );
}
export function AssignmentsWorkspace({ role }: { role: Role }) {
  const { can } = usePermissions();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold sm:text-3xl">الواجبات والتكليفات</h1>
      <p className="text-sm leading-7 text-muted-foreground">
        {role === "teacher"
          ? "تابع واجبات مجموعاتك وإجابات الطلاب."
          : role === "admin"
            ? "تابع الواجبات والتسليم والتصحيح من لوحة الإدارة."
            : role === "parent"
              ? "اختار ابنًا لمتابعة واجباته والتسليم وملاحظات المدرس."
              : "راجع المطلوب وسلّم إجابتك وتابع تصحيح المدرس."}{" "}
        محاكاة بدون حفظ دائم.
      </p>
      {role === "teacher" && can(role, "assignments:create") && <AssignmentCreator />}
      {role === "parent" ? (
        <ParentRecords />
      ) : (
        <Records
          role={role}
          learnerId={role === "student" ? previewStudentId : undefined}
        />
      )}
    </div>
  );
}
