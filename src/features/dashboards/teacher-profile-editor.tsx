"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Camera, GraduationCap, Save, UserRound } from "lucide-react";
import { Badge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { grades, stages, subjects } from "@/features/catalog/mock-data";
import { Panel } from "./dashboard-panels";
import { curriculumOptions } from "./management-fixtures";
import { usePortalPreview } from "./preview-context";
import type { TeacherProfileDraft } from "./management-types";
import type { StageId, SubjectId } from "@/features/catalog/types";

type ProfileTextKey =
  | "fullName"
  | "displayName"
  | "email"
  | "phone"
  | "governorate"
  | "qualification";

export function TeacherProfileEditor() {
  const { teacherProfile, saveTeacherProfile } = usePortalPreview();
  const [draft, setDraft] = useState<TeacherProfileDraft>(teacherProfile);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      if (avatarUrl) URL.revokeObjectURL(avatarUrl);
    },
    [avatarUrl],
  );
  const update = <K extends keyof TeacherProfileDraft>(
    key: K,
    value: TeacherProfileDraft[K],
  ) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setMessage("");
    setError("");
  };
  const changeStage = (stageId: StageId) => {
    const next = draft.stageIds.includes(stageId)
      ? draft.stageIds.filter((id) => id !== stageId)
      : [...draft.stageIds, stageId];
    setDraft({
      ...draft,
      stageIds: next,
      gradeIds: draft.gradeIds.filter((id) =>
        next.includes(grades.find((g) => g.id === id)!.stageId),
      ),
    });
    setError("");
    setMessage("");
  };
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const emptyName = (["fullName", "displayName"] as const).find(
          (key) => !draft[key].trim(),
        );
        if (emptyName) {
          setError("اكتب اسم المدرس واسم الظهور قبل الحفظ.");
          document.getElementById(`teacher-${emptyName}`)?.focus();
          return;
        }
        if (!draft.stageIds.length || !draft.gradeIds.length) {
          setError(
            "اختار مرحلة وصفًا دراسيًا واحدًا على الأقل لتحديد نطاق المنهج في المعاينة.",
          );
          return;
        }
        const result = saveTeacherProfile({
          ...draft,
          fullName: draft.fullName.trim(),
          displayName: draft.displayName.trim(),
          bio: draft.bio.trim(),
        });
        if (!result.ok) {
          setError(result.error ?? "تعذّر حفظ المادة في المعاينة.");
          return;
        }
        setMessage(
          "تم حفظ الملف في المعاينة مؤقتًا. لا توجد بيانات مرسلة أو صلاحيات تدريس جديدة.",
        );
      }}
      className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]"
    >
      <div className="space-y-4">
        <Panel
          title="البيانات الشخصية والمهنية"
          subtitle="استخدم بيانات افتراضية فقط"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                key: "fullName",
                label: "الاسم الكامل",
                type: "text",
                required: true,
              },
              {
                key: "displayName",
                label: "اسم الظهور للطلاب",
                type: "text",
                required: true,
              },
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
              {
                key: "governorate",
                label: "المحافظة",
                type: "text",
                required: true,
              },
              {
                key: "qualification",
                label: "المؤهل الدراسي",
                type: "text",
                required: true,
              },
            ].map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`teacher-${field.key}`}>{field.label}</Label>
                <Input
                  id={`teacher-${field.key}`}
                  type={field.type}
                  autoComplete="off"
                  value={draft[field.key as ProfileTextKey]}
                  maxLength={160}
                  required={field.required}
                  dir={
                    field.type === "email" || field.type === "tel"
                      ? "ltr"
                      : undefined
                  }
                  className="min-h-11 rounded-xl"
                  onChange={(e) =>
                    update(field.key as ProfileTextKey, e.target.value)
                  }
                />
              </div>
            ))}
            <div className="space-y-2">
              <Label htmlFor="teacher-experience">سنوات الخبرة</Label>
              <Input
                id="teacher-experience"
                type="number"
                min={0}
                max={60}
                required
                value={draft.experienceYears}
                className="min-h-11 rounded-xl"
                onChange={(e) =>
                  update(
                    "experienceYears",
                    e.target.value === "" ? 0 : Number(e.target.value),
                  )
                }
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="teacher-bio">نبذة عن المدرس</Label>
            <textarea
              id="teacher-bio"
              className="field min-h-32 py-3"
              value={draft.bio}
              onChange={(e) => update("bio", e.target.value)}
              required
              minLength={20}
              maxLength={1500}
            />
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="teacher-approach">أسلوب الشرح والتدريس</Label>
            <textarea
              id="teacher-approach"
              className="field min-h-28 py-3"
              value={draft.teachingApproach}
              onChange={(e) => update("teachingApproach", e.target.value)}
              required
              maxLength={1000}
            />
          </div>
        </Panel>
        <Panel
          title="التخصص والمنهج الدراسي"
          subtitle="مادة واحدة لكل مدرس؛ المادة نفسها يمكن أن ترتبط بأكثر من مدرس. يجب أن تطابق مادة المقررات المسندة."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="teacher-specialization">التخصص الأساسي</Label>
              <select
                id="teacher-specialization"
                className="field"
                value={draft.specialization}
                onChange={(e) =>
                  update("specialization", e.target.value as SubjectId)
                }
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-specialty-detail">التخصص الدقيق</Label>
              <Input
                id="teacher-specialty-detail"
                value={draft.specialtyDetail}
                onChange={(e) => update("specialtyDetail", e.target.value)}
                required
                maxLength={150}
                className="min-h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-curriculum">المنهج</Label>
              <select
                id="teacher-curriculum"
                className="field"
                value={draft.curriculumId}
                onChange={(e) => update("curriculumId", e.target.value)}
              >
                {curriculumOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-year">العام الدراسي</Label>
              <select
                id="teacher-year"
                className="field"
                value={draft.academicYear}
                onChange={(e) => update("academicYear", e.target.value)}
              >
                <option value="2026-2027">٢٠٢٦ / ٢٠٢٧</option>
                <option value="2025-2026">٢٠٢٥ / ٢٠٢٦</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-term">الفصل الدراسي</Label>
              <select
                id="teacher-term"
                className="field"
                value={draft.term}
                onChange={(e) => update("term", e.target.value)}
              >
                <option value="first">الفصل الدراسي الأول</option>
                <option value="second">الفصل الدراسي الثاني</option>
                <option value="both">الفصلان الدراسيان</option>
              </select>
            </div>
          </div>
          <fieldset className="mt-4">
            <legend className="mb-3 text-sm font-bold">
              المراحل التي يدرّسها
            </legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {stages.map((stage) => (
                <label
                  key={stage.id}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs"
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={draft.stageIds.includes(stage.id)}
                    onChange={() => changeStage(stage.id)}
                  />
                  {stage.name}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-4">
            <legend className="mb-3 text-sm font-bold">الصفوف الدراسية</legend>
            {draft.stageIds.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {grades
                  .filter((grade) => draft.stageIds.includes(grade.stageId))
                  .map((grade) => (
                    <label
                      key={grade.id}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={draft.gradeIds.includes(grade.id)}
                        onChange={() =>
                          update(
                            "gradeIds",
                            draft.gradeIds.includes(grade.id)
                              ? draft.gradeIds.filter((id) => id !== grade.id)
                              : [...draft.gradeIds, grade.id],
                          )
                        }
                      />
                      {grade.name}
                    </label>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                اختار مرحلة لعرض صفوفها.
              </p>
            )}
          </fieldset>
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
              حفظ الملف في المعاينة
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraft(teacherProfile);
                setMessage("");
                setError("");
              }}
            >
              إلغاء التعديلات
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            الحفظ مؤقت أثناء التنقّل بين اللوحات؛ تحديث الصفحة يعيد البيانات
            الافتراضية.
          </p>
        </div>
      </div>
      <aside className="space-y-4 xl:sticky xl:top-5">
        <Panel title="معاينة الملف المهني">
          <div className="mb-4 flex justify-center">
            <div className="relative flex size-24 items-center justify-center overflow-hidden rounded-md border-4 border-white bg-secondary ring-1 ring-border">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="معاينة الصورة المحلية"
                  width={96}
                  height={96}
                  unoptimized
                  className="size-full object-cover"
                />
              ) : (
                <UserRound
                  aria-hidden="true"
                  className="size-10 text-primary"
                />
              )}
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold">
              {draft.displayName || "اسم المدرس"}
            </h2>
            <p className="mt-2 text-sm text-primary">
              {subjects.find((s) => s.id === draft.specialization)?.name}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {draft.specialtyDetail}
            </p>
            <Badge className="mt-4">شخصية افتراضية</Badge>
          </div>
          <div className="my-4 border-t pt-4">
            <label
              htmlFor="teacher-avatar"
              className="mb-2 flex items-center gap-2 text-xs font-bold"
            >
              <Camera aria-hidden="true" className="size-4" />
              صورة الملف — معاينة محلية
            </label>
            <input
              ref={uploadRef}
              id="teacher-avatar"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="block w-full min-w-0 text-xs file:me-2 file:rounded-lg file:border file:bg-secondary file:px-2 file:py-2"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (
                  !["image/png", "image/jpeg", "image/webp"].includes(
                    file.type,
                  ) ||
                  file.size > 2 * 1024 * 1024
                ) {
                  setError(
                    "اختار صورة PNG أو JPG أو WebP لا تتجاوز ٢ ميجابايت للمعاينة.",
                  );
                  if (uploadRef.current) uploadRef.current.value = "";
                  return;
                }
                setAvatarUrl(URL.createObjectURL(file));
                setError("");
              }}
            />
            <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
              PNG / JPG / WebP · حتى ٢ ميجابايت للمعاينة. الصورة لا تُرفع أو
              تُحفظ.
            </p>
          </div>
          <div className="space-y-3 border-t pt-4 text-xs text-muted-foreground">
            <p className="flex items-center gap-2">
              <GraduationCap aria-hidden="true" className="size-4 shrink-0" />
              {draft.qualification}
            </p>
            <p>
              {curriculumOptions.find((c) => c.id === draft.curriculumId)?.name}
            </p>
            <p>
              {draft.gradeIds.length} صفوف مختارة · {draft.experienceYears}{" "}
              سنوات خبرة توضيحية
            </p>
          </div>
        </Panel>
      </aside>
    </form>
  );
}
