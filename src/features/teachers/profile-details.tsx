import { grades, stages, getSubject } from "@/features/catalog/mock-data";
import { curriculumOptions } from "@/features/dashboards/management-fixtures";
import type { TeacherProfileDraft } from "@/features/dashboards/management-types";
import { IntroVideo } from "./intro-video";

export function TeacherProfileDetails({ profile }: { profile: TeacherProfileDraft }) {
  const fields = [
    ["الاسم الكامل", profile.fullName], ["اسم الظهور", profile.displayName],
    ["البريد الإلكتروني", profile.email], ["رقم الهاتف", profile.phone],
    ["المحافظة", profile.governorate], ["المؤهل", profile.qualification],
    ["سنوات الخبرة", profile.experienceYears], ["المادة", getSubject(profile.specialization)?.name],
    ["تفاصيل التخصص", profile.specialtyDetail],
    ["المنهج", curriculumOptions.find(({ id }) => id === profile.curriculumId)?.name],
    ["العام الدراسي", profile.academicYear], ["الفصل الدراسي", profile.term],
    ["المراحل", stages.filter(({ id }) => profile.stageIds.includes(id)).map(({ name }) => name).join("، ")],
    ["الصفوف", grades.filter(({ id }) => profile.gradeIds.includes(id)).map(({ name }) => name).join("، ")],
  ] as const;
  return (
    <div className="space-y-4 text-sm">
      <dl className="grid gap-3 sm:grid-cols-2">
        {fields.filter(([, value]) => value !== "" && value !== undefined).map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="font-bold">{label}</dt>
            <dd className="break-words"><bdi>{value}</bdi></dd>
          </div>
        ))}
      </dl>
      <div><h3 className="font-bold">النبذة</h3><p className="whitespace-pre-wrap break-words">{profile.bio}</p></div>
      <div><h3 className="font-bold">طريقة الشرح</h3><p className="whitespace-pre-wrap break-words">{profile.teachingApproach}</p></div>
      {profile.introVideo ? <IntroVideo file={profile.introVideo} /> : <p className="text-muted-foreground">مفيش فيديو شرح مرفق.</p>}
    </div>
  );
}
