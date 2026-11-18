"use client";
import { useState } from "react";
import { Badge, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Panel } from "@/features/dashboards/dashboard-panels";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import Link from "next/link";
import { portalCourseHref } from "./routes";
import { grades, getGrade, getSubject } from "@/features/catalog/mock-data";
import { ContentEditor } from "./editor";
import { ContentField } from "./fields";
import { CourseContentPreview } from "./preview";
import { useContent } from "./context";
import { contentStatuses } from "./logic";
import type { ContentRecord, ContentRole, ContentResult } from "./types";

function PreviewDialog({
  record,
  published = false,
}: {
  record: ContentRecord;
  published?: boolean;
}) {
  const course = published ? record.published : record.working;
  if (!course) return null;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          {published ? "معاينة النسخة المنشورة" : "معاينة نسخة العمل"}
        </Button>
      </DialogTrigger>
      <DialogContent
        dir="rtl"
        className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
      >
        <DialogHeader>
          <DialogTitle>{course.title}</DialogTitle>
          <DialogDescription>
            {published
              ? "نسخة معتمدة في المحاكاة فقط."
              : "نسخة العمل للمراجعة؛ لا تظهر للطلاب قبل اعتمادها."}{" "}
            لا يوجد نشر للموقع العام أو تحميل موارد فعلي.
          </DialogDescription>
        </DialogHeader>
        <CourseContentPreview course={course} />
      </DialogContent>
    </Dialog>
  );
}
function ReasonAction({
  record,
  action,
  role,
  disabled,
}: {
  record: ContentRecord;
  action: "changes" | "unpublish";
  role: ContentRole;
  disabled: boolean;
}) {
  const { transition } = useContent();
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState(""),
    [error, setError] = useState("");
  const label = action === "changes" ? "طلب تعديلات" : "إيقاف النشر التجريبي";
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        setReason("");
        setError("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            {action === "changes"
              ? "أوضح المطلوب للمدرس. آخر نسخة منشورة ستبقى ظاهرة للطلاب."
              : "سيختفي المقرر من مكتبة الطالب التجريبية؛ المسودة تبقى ويمكن مراجعتها ونشرها مجددًا."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const result = transition(record.working.id, action, role, reason);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setOpen(false);
          }}
        >
          <ContentField label="سبب الإجراء">
            <textarea
              className="field min-h-24"
              required
              minLength={3}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </ContentField>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit">تأكيد الإجراء</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function ContentCard({
  record,
  role,
}: {
  record: ContentRecord;
  role: ContentRole;
}) {
  const { transition } = useContent();
  const registry = useEnrollmentPreview();
  const [result, setResult] = useState<ContentResult>();
  const course = record.working;
  const enabled = registry.isEntityActive(
    role,
    role === "admin" ? "preview-admin" : "ahmed-hassan",
  );
  return (
    <article
      className="min-w-0 space-y-3 rounded-lg border p-3 sm:p-4"
      data-content-id={course.id}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="break-words font-bold">{course.title}</h3>
        <Badge>{contentStatuses[record.status]}</Badge>
      </div>
      <p className="text-xs leading-7 text-muted-foreground">
        {getGrade(course.gradeId)?.name} · {getSubject(course.subjectId)?.name}{" "}
        ·{" "}
        {
          registry.accounts.find(
            (a) => a.kind === "teacher" && a.entityId === course.teacherId,
          )?.name
        }
      </p>
      <p className="text-sm">
        {course.units.length} وحدات ·{" "}
        {course.units.reduce((sum, u) => sum + u.lessons.length, 0)} دروس · نسخة
        العمل {record.revision}
        {record.publishedRevision !== undefined
          ? ` · المنشورة ${record.publishedRevision}`
          : " · غير منشور للطلاب"}
      </p>
      {record.reviewNote && (
        <p className="whitespace-pre-wrap break-words rounded-md bg-secondary/50 p-3 text-sm leading-7">
          ملاحظة الإدارة: {record.reviewNote}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <ContentEditor record={record} role={role} />
        <PreviewDialog record={record} />
        {record.published && <PreviewDialog record={record} published />}
        {(record.status === "draft" || record.status === "changes") && (
          <Button
            disabled={!enabled}
            onClick={() => setResult(transition(course.id, "submit", role))}
          >
            إرسال للمراجعة
          </Button>
        )}
        {record.status === "review" && (
          <Button
            variant="outline"
            disabled={!enabled}
            onClick={() => setResult(transition(course.id, "withdraw", role))}
          >
            سحب للمسودة
          </Button>
        )}
        {role === "admin" && record.status === "review" && (
          <>
            <Button
              disabled={!enabled}
              onClick={() => setResult(transition(course.id, "approve", role))}
            >
              اعتماد ونشر تجريبي
            </Button>
            <ReasonAction
              record={record}
              role={role}
              action="changes"
              disabled={!enabled}
            />
          </>
        )}
        {role === "admin" && record.published && (
          <ReasonAction
            record={record}
            role={role}
            action="unpublish"
            disabled={!enabled}
          />
        )}
      </div>
      {result && (
        <p role={result.ok ? "status" : "alert"} className="text-sm leading-7">
          {result.ok ? "تم تحديث حالة المحتوى في المعاينة." : result.error}
        </p>
      )}
    </article>
  );
}
export function ContentWorkspace({ role }: { role: ContentRole }) {
  const { records } = useContent();
  const { accounts } = useEnrollmentPreview();
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [grade, setGrade] = useState(""),
    [teacher, setTeacher] = useState("");
  const visible = records.filter(
    (r) =>
      (role === "admin" || r.working.teacherId === "ahmed-hassan") &&
      r.working.title.includes(query.trim()) &&
      (!status || r.status === status) &&
      (!grade || r.working.gradeId === grade) &&
      (!teacher || r.working.teacherId === teacher),
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">إدارة المحتوى</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            جهّز المقرر ووحداته ودروسه وموارده، ثم راجع النسخة قبل اعتمادها. كل
            التعديلات مؤقتة داخل اللوحات فقط.
          </p>
        </div>
        <ContentEditor role={role} />
      </div>
      <Panel
        title="المقررات والمراجعات"
        subtitle="النسخ المعتمدة متاحة للمجموعات والحصص والواجبات داخل اللوحات. المسودات لا تغيّر المحتوى الذي يراه الطلاب."
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ContentField label="بحث المحتوى">
            <input
              className="field"
              type="search"
              maxLength={160}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </ContentField>
          <ContentField label="حالة المحتوى">
            <select
              className="field"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">كل الحالات</option>
              {Object.entries(contentStatuses).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </ContentField>
          <ContentField label="تصفية صف المحتوى">
            <select
              className="field"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              <option value="">كل الصفوف</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </ContentField>
          {role === "admin" && (
            <ContentField label="تصفية مدرس المحتوى">
              <select
                className="field"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
              >
                <option value="">كل المدرسين</option>
                {accounts
                  .filter((a) => a.kind === "teacher")
                  .map((a) => (
                    <option key={a.id} value={a.entityId}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </ContentField>
          )}
        </div>
        <div className="grid gap-3">
          {visible.map((record) => (
            <ContentCard key={record.working.id} record={record} role={role} />
          ))}
        </div>
        {!visible.length && <EmptyState title="لا توجد مقررات مطابقة" />}
      </Panel>
    </div>
  );
}
export function StudentContentLibrary() {
  const { records } = useContent();
  const { getStudentCourses } = useEnrollmentPreview();
  const ids = new Set(getStudentCourses("youssef").map((c) => c.courseId));
  const visible = records.filter((r) => r.published && ids.has(r.working.id));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold sm:text-3xl">المكتبة التعليمية</h1>
      <p className="text-sm leading-7 text-muted-foreground">
        المحتوى المعتمد المرتبط بمجموعاتك في المحاكاة. نفس المقررات الظاهرة في
        مقرراتي، والبيانات مؤقتة.
      </p>
      <Panel
        title="المقررات المعتمدة"
        subtitle="المسودات وطلبات المراجعة غير ظاهرة هنا."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((record) => (
            <article
              key={record.working.id}
              data-published-content={record.working.id}
              className="space-y-3 rounded-lg border p-3"
            >
              <h3 className="break-words font-bold">
                {record.published!.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {getSubject(record.published!.subjectId)?.name} · نسخة{" "}
                {record.publishedRevision}
              </p>
              <PreviewDialog record={record} published />
              <Button asChild variant="outline">
                <Link href={portalCourseHref("student", record.working.id)}>
                  فتح المقرر
                </Link>
              </Button>
            </article>
          ))}
        </div>
        {!visible.length && (
          <EmptyState title="لا يوجد محتوى معتمد مرتبط بك حاليًا" />
        )}
      </Panel>
    </div>
  );
}
