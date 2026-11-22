"use client";

import { startTransition, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PasswordField } from "@/features/auth/form-controls";
import { onboardTeacher } from "./teacher-onboarding-actions";

export type TeacherApplicationDraft = {
  id: string;
  full_name: string;
  email: string;
  subject_id: string;
  details: {
    phone?: string; governorate?: string; qualification?: string; experience?: number;
    bio?: string; approach?: string; video?: string; grades?: string[];
  } | null;
};

export function TeacherOnboardingDialog({ application, subjects, grades }: {
  application?: TeacherApplicationDraft;
  subjects: { id: string; name: string }[];
  grades: { id: string; name: string }[];
}) {
  const [error, submit, pending] = useActionState(onboardTeacher.bind(null, application?.id ?? null), "");
  const router = useRouter();
  const details = application?.details;
  const label = application ? "استكمال قبول المدرس" : "إنشاء حساب مدرس";
  return (
    <Dialog defaultOpen={!!application} onOpenChange={(open) => {
      if (!open && application) router.replace("/admin/teachers", { scroll: false });
    }}>
      <DialogTrigger asChild><Button type="button" className="ms-auto min-h-11">{label}</Button></DialogTrigger>
      <DialogContent dir="rtl" className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sm:max-w-2xl sm:p-6">
        <DialogHeader className="pe-12 text-start">
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{application ? "راجع بيانات الطلب وحدّد كلمة مرور للحساب قبل الحفظ." : "احفظ بيانات الحساب والملف الشخصي للمدرس في خطوة واحدة."}</DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <form className="grid gap-4" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          startTransition(() => submit(form));
        }}>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ["fullName", "الاسم الكامل", "text", 160, application?.full_name],
              ["displayName", "اسم الظهور في الحساب", "text", 100, application?.full_name.slice(0, 100)],
              ["email", "بريد المدرس", "email", 254, application?.email],
              ["phone", "رقم الهاتف", "tel", 25, details?.phone],
              ["governorate", "المحافظة", "text", 80, details?.governorate],
              ["qualification", "المؤهل", "text", 160, details?.qualification],
            ] as const).map(([name, title, type, length, value]) => (
              <label key={name} className="grid gap-2 text-sm font-semibold">{title}
                <input className="field" name={name} type={type} maxLength={length} defaultValue={value}
                  dir={type === "email" || type === "tel" ? "ltr" : undefined} readOnly={name === "email" && !!application} required />
              </label>
            ))}
            <PasswordField fresh />
            <label className="grid gap-2 text-sm font-semibold">سنوات الخبرة
              <input className="field" name="experience" type="number" min={0} max={70} defaultValue={details?.experience} required />
            </label>
          </div>
          <div className="grid gap-2">
            <label htmlFor="onboarding-subject" className="text-sm font-semibold">المادة</label>
            <select id="onboarding-subject" name="subject" className="field" defaultValue={application?.subject_id ?? ""} required>
              <option value="" disabled>اختار المادة</option>
              {subjects.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          <fieldset className="rounded-lg border p-3">
            <legend className="px-1 text-sm font-semibold">الصفوف اللي بيدرّسها</legend>
            <div className="grid max-h-40 gap-1 overflow-y-auto sm:grid-cols-2">
              {grades.map(({ id, name }) => <label key={id} className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" name="grades" value={id} defaultChecked={details?.grades?.includes(id)} />{name}
              </label>)}
            </div>
          </fieldset>
          <label className="grid gap-2 text-sm font-semibold">نبذة عن المدرس
            <textarea name="bio" className="field min-h-24 py-2" minLength={20} maxLength={1500} defaultValue={details?.bio} required />
          </label>
          <label className="grid gap-2 text-sm font-semibold">طريقة الشرح
            <textarea name="approach" className="field min-h-24 py-2" minLength={10} maxLength={1000} defaultValue={details?.approach} required />
          </label>
          <label className="grid gap-2 text-sm font-semibold">رابط فيديو تعريفي (اختياري)
            <input name="video" className="field" type="url" maxLength={2048} dir="ltr" defaultValue={details?.video} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">مسار صورة موجودة على الموقع (اختياري)
            <input name="portrait" className="field" dir="ltr" placeholder="/teachers/name.webp" maxLength={180} />
          </label>
          <Button type="submit" className="min-h-11" disabled={pending || !subjects.length || !grades.length}>
            {pending ? "جارٍ الحفظ…" : application ? "قبول وإنشاء حساب المدرس" : "حفظ الحساب والملف"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
