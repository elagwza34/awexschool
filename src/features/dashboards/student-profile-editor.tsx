"use client";

import { useState } from "react";
import { GraduationCap, HeartHandshake, Save, UserRound } from "lucide-react";
import { Badge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { grades, stages, getGrade } from "@/features/catalog/mock-data";
import type { StageId } from "@/features/catalog/types";
import { Panel } from "./dashboard-panels";
import { curriculumOptions } from "./management-fixtures";
import { usePortalPreview } from "./preview-context";
import { studentGuardianFixture, type StudentProfileDraft } from "./student-profile-data";

const personalFields = [
  { key: "fullName", label: "اسم الطالب الكامل", type: "text", required: true },
  { key: "displayName", label: "اسم الظهور", type: "text", required: true },
  {
    key: "email",
    label: "البريد الإلكتروني التجريبي",
    type: "email",
    required: true,
  },
  {
    key: "phone",
    label: "رقم الهاتف التجريبي (اختياري)",
    type: "tel",
    required: false,
  },
  { key: "governorate", label: "المحافظة", type: "text", required: false },
  {
    key: "schoolName",
    label: "اسم المدرسة التجريبي",
    type: "text",
    required: false,
  },
] as const;

export function StudentProfileEditor() {
  const { studentProfile, saveStudentProfile } = usePortalPreview();
  const [draft, setDraft] = useState<StudentProfileDraft>(studentProfile);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const update = <K extends keyof StudentProfileDraft>(
    key: K,
    value: StudentProfileDraft[K],
  ) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setMessage("");
    setError("");
  };
  return (
    <form
      className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]"
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.fullName.trim() || !draft.displayName.trim()) {
          setError("اكتب اسم الطالب واسم الظهور قبل الحفظ.");
          return;
        }
        if (
          !grades.some(
            (grade) =>
              grade.id === draft.gradeId && grade.stageId === draft.stageId,
          )
        ) {
          setError("اختار صفًا تابعًا للمرحلة الدراسية المحددة.");
          return;
        }
        saveStudentProfile({
          ...draft,
          fullName: draft.fullName.trim(),
          displayName: draft.displayName.trim(),
          about: draft.about.trim(),
        });
        setError("");
        setMessage(
          "تم حفظ البروفايل في المعاينة مؤقتًا. لا توجد بيانات مرسلة أو تغييرات فعلية على الحساب.",
        );
      }}
    >
      <div className="space-y-4">
        <Panel
          title="بياناتي الشخصية"
          subtitle="بيانات افتراضية للتجربة؛ لا تدخل معلومات حقيقية"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {personalFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`student-${field.key}`}>{field.label}</Label>
                <Input
                  id={`student-${field.key}`}
                  type={field.type}
                  value={draft[field.key]}
                  required={field.required}
                  maxLength={120}
                  autoComplete="off"
                  dir={
                    field.type === "email" || field.type === "tel"
                      ? "ltr"
                      : undefined
                  }
                  onChange={(e) => update(field.key, e.target.value)}
                  className="min-h-11 rounded-xl"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="student-about">نبذة عني واهتماماتي</Label>
            <textarea
              id="student-about"
              className="field min-h-28 py-3"
              value={draft.about}
              onChange={(e) => update("about", e.target.value)}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              مثال: مواد بحبها، أو طريقة بتساعدني أفهم أكتر.
            </p>
          </div>
        </Panel>
        <Panel
          title="بياناتي الدراسية"
          subtitle="تغيير الصف هنا يخص البروفايل التجريبي ولا يغيّر المقررات أو صلاحيات الوصول"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="student-stage">المرحلة الدراسية</Label>
              <select
                id="student-stage"
                className="field"
                value={draft.stageId}
                onChange={(e) => {
                  const stageId = e.target.value as StageId;
                  setDraft({
                    ...draft,
                    stageId,
                    gradeId: grades.find((grade) => grade.stageId === stageId)!
                      .id,
                  });
                  setMessage("");
                  setError("");
                }}
              >
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-grade">الصف الدراسي</Label>
              <select
                id="student-grade"
                className="field"
                value={draft.gradeId}
                onChange={(e) => update("gradeId", e.target.value)}
              >
                {grades
                  .filter((grade) => grade.stageId === draft.stageId)
                  .map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {grade.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-curriculum">المنهج الدراسي</Label>
              <select
                id="student-curriculum"
                className="field"
                value={draft.curriculumId}
                onChange={(e) => update("curriculumId", e.target.value)}
              >
                {curriculumOptions.map((curriculum) => (
                  <option key={curriculum.id} value={curriculum.id}>
                    {curriculum.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-year">العام الدراسي</Label>
              <select
                id="student-year"
                className="field"
                value={draft.academicYear}
                onChange={(e) => update("academicYear", e.target.value)}
              >
                <option value="2026-2027">٢٠٢٦ / ٢٠٢٧</option>
                <option value="2025-2026">٢٠٢٥ / ٢٠٢٦</option>
              </select>
            </div>
          </div>
        </Panel>
        <div className="soft-card p-4">
          {error && (
            <p role="alert" className="mb-4 text-sm text-destructive">
              {error}
            </p>
          )}
          {message && (
            <p
              role="status"
              className="mb-4 text-sm font-semibold text-primary"
            >
              {message}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="submit">
              <Save aria-hidden="true" />
              حفظ البروفايل في المعاينة
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraft(studentProfile);
                setMessage("");
                setError("");
              }}
            >
              إلغاء التعديلات
            </Button>
          </div>
          <p className="mt-3 text-xs leading-7 text-muted-foreground">
            الحفظ مؤقت أثناء التنقّل بين اللوحات. تحديث الصفحة يعيد البيانات
            الافتراضية.
          </p>
        </div>
      </div>
      <div className="space-y-4 xl:sticky xl:top-(--site-sticky-top)">
        <Panel title="بروفايل الطالب">
          <div className="text-center">
            <span className="mx-auto mb-4 flex size-24 items-center justify-center rounded-md border-4 border-white bg-secondary text-primary ring-1 ring-border">
              <UserRound aria-hidden="true" className="size-10" />
            </span>
            <h2 className="text-xl font-semibold">
              {draft.displayName || "اسم الطالب"}
            </h2>
            <p className="my-3 text-sm text-muted-foreground">
              {getGrade(draft.gradeId)?.name}
            </p>
            <Badge>طالب افتراضي · نسخة تجريبية</Badge>
          </div>
          <div className="mt-4 space-y-3 border-t pt-4 text-xs text-muted-foreground">
            <p className="flex items-start gap-2">
              <GraduationCap aria-hidden="true" className="size-4 shrink-0" />
              {draft.schoolName || "لم يُحدد اسم المدرسة"}
            </p>
            <p>
              {
                curriculumOptions.find(
                  (curriculum) => curriculum.id === draft.curriculumId,
                )?.name
              }
            </p>
            <p className="break-words leading-7">{draft.about}</p>
          </div>
        </Panel>
        <Panel title="ولي الأمر في المعاينة">
          <HeartHandshake
            aria-hidden="true"
            className="mb-4 size-7 text-primary"
          />
          <p className="text-sm font-bold">{studentGuardianFixture.displayName}</p>
          <p className="mt-3 text-xs leading-7 text-muted-foreground">
            اسم افتراضي لعرض العلاقة فقط. تعديل البروفايل لا ينشئ أو يغيّر
            ارتباط ولي أمر فعلي.
          </p>
        </Panel>
      </div>
    </form>
  );
}
