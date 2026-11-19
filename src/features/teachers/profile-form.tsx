"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { grades, stages, subjects } from "@/features/catalog/mock-data";
import type { StageId, SubjectId } from "@/features/catalog/types";
import { curriculumOptions } from "@/features/dashboards/management-fixtures";
import type { TeacherProfileDraft } from "@/features/dashboards/management-types";
import { IntroVideoField } from "./intro-video";

const identityFields = [
  ["fullName", "الاسم الكامل", "text", 160],
  ["displayName", "اسم الظهور", "text", 160],
  ["email", "البريد الإلكتروني", "email", 254],
  ["phone", "رقم الهاتف", "tel", 30],
  ["governorate", "المحافظة", "text", 80],
  ["qualification", "المؤهل", "text", 160],
] as const;

export function TeacherProfileForm({ submitLabel, onSave }: {
  submitLabel: string;
  onSave: (profile: TeacherProfileDraft) => string | undefined;
}) {
  const [stageIds, setStageIds] = useState<StageId[]>([]);
  const [introVideo, setIntroVideo] = useState<File>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  return (
    <form className="grid gap-5" onSubmit={(event) => {
      event.preventDefault();
      if (pending) return;
      const data = new FormData(event.currentTarget);
      const read = (key: string) => String(data.get(key) ?? "").trim();
      const gradeIds = data.getAll("gradeIds").map(String);
      if (!stageIds.length || !gradeIds.length) {
        setError("اختار مرحلة وصف دراسي واحد على الأقل.");
        return;
      }
      if (identityFields.some(([key]) => !read(key)) || !read("bio") || !read("teachingApproach")) {
        setError("كمّل البيانات المطلوبة قبل الحفظ.");
        return;
      }
      const failure = onSave({
        fullName: read("fullName"), displayName: read("displayName"),
        email: read("email").toLowerCase(), phone: read("phone"), governorate: read("governorate"),
        qualification: read("qualification"), experienceYears: Number(read("experienceYears")),
        bio: read("bio"), teachingApproach: read("teachingApproach"),
        specialization: read("specialization") as SubjectId,
        specialtyDetail: read("specialtyDetail"), curriculumId: read("curriculumId"),
        academicYear: read("academicYear"), term: read("term"), stageIds, gradeIds, introVideo,
      });
      setError(failure ?? "");
    }}>
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-3 text-base font-bold">البيانات الشخصية والمهنية</legend>
        {identityFields.map(([key, label, type, maxLength]) => (
          <label key={key} className="grid gap-2 text-sm font-semibold">
            {label}
            <input className="field" name={key} type={type} dir={type === "email" || type === "tel" ? "ltr" : undefined}
              minLength={2} maxLength={maxLength} required />
          </label>
        ))}
        <label className="grid gap-2 text-sm font-semibold">سنوات الخبرة
          <input className="field" name="experienceYears" type="number" min={0} max={70} step={1} required />
        </label>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-3 text-base font-bold">المادة والمنهج</legend>
        <label className="grid gap-2 text-sm font-semibold">المادة
          <select className="field" name="specialization" defaultValue="" required>
            <option value="" disabled>اختار المادة</option>
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">تفاصيل التخصص (اختياري)
          <input className="field" name="specialtyDetail" maxLength={160} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">المنهج (اختياري)
          <select className="field" name="curriculumId" defaultValue="">
            <option value="">اختار المنهج</option>
            {curriculumOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">العام الدراسي (اختياري)
          <input className="field" name="academicYear" maxLength={30} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">الفصل الدراسي (اختياري)
          <input className="field" name="term" maxLength={80} />
        </label>
      </fieldset>
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-bold">المراحل الدراسية</legend>
        {stages.map(({ id, name }) => (
          <label key={id} className="flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={stageIds.includes(id)} onChange={(event) => {
              const checked = event.target.checked;
              setStageIds((current) => checked ? [...current, id] : current.filter((item) => item !== id));
            }} />{name}
          </label>
        ))}
      </fieldset>
      {stageIds.length > 0 && (
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-bold">الصفوف الدراسية</legend>
          {grades.filter((grade) => stageIds.includes(grade.stageId)).map(({ id, name }) => (
            <label key={id} className="flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm">
              <input type="checkbox" className="size-4 accent-primary" name="gradeIds" value={id} />{name}
            </label>
          ))}
        </fieldset>
      )}
      <label className="grid gap-2 text-sm font-semibold">نبذة عنك
        <textarea className="field min-h-24 py-2" name="bio" required minLength={20} maxLength={1500} />
      </label>
      <label className="grid gap-2 text-sm font-semibold">طريقة الشرح
        <textarea className="field min-h-24 py-2" name="teachingApproach" required maxLength={1000} />
      </label>
      <IntroVideoField file={introVideo} onChange={setIntroVideo} onPending={setPending} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="justify-self-start" disabled={pending}>{submitLabel}</Button>
    </form>
  );
}
