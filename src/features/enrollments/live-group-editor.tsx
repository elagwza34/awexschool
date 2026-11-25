"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { saveLearningGroup } from "./group-admin-actions";

const groupWeekdays = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];
type Option = { id: string; name: string };
export type StudentOption = Option & { courseIds: string[] };
export type EditableGroup = {
  id: string; name: string; course_id: string; teacher_id: string; capacity: number;
  fee_minor: number; weekday: number; starts_at_local: string; active: boolean;
};

export function studentsForCourse(students: StudentOption[], courseId: string) {
  return courseId ? students.filter(({ courseIds }) => courseIds.includes(courseId)) : [];
}

export function invalidStudentSelections(students: StudentOption[], courseId: string, selectedIds: ReadonlySet<string>) {
  const eligibleIds = new Set(studentsForCourse(students, courseId).map(({ id }) => id));
  return [...selectedIds].filter((id) => !eligibleIds.has(id));
}

export function LiveGroupEditor({ group, courses, teachers, students, memberCount }: {
  group?: EditableGroup; courses: Option[]; teachers: Option[]; students: StudentOption[]; memberCount: number;
}) {
  const [error, submit, pending] = useActionState(saveLearningGroup.bind(null, group?.id ?? null), "");
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState(group?.course_id ?? "");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(() => new Set());
  const [selectionError, setSelectionError] = useState("");
  const availableStudents = studentsForCourse(students, courseId);
  const router = useRouter();
  const title = group ? "تعديل المجموعة وإضافة طلاب" : "إنشاء مجموعة";
  return (
    <Dialog defaultOpen={Boolean(group)} onOpenChange={(open) => {
      if (!open && group) router.replace("/admin/group-requests", { scroll: false });
    }}>
      <DialogTrigger asChild><Button variant={group ? "outline" : "default"}>{title}</Button></DialogTrigger>
      <DialogContent dir="rtl" className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sm:max-w-2xl sm:p-6">
        <DialogHeader className="pe-12 text-start">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>حدّد المقرر والمدرس وموعد الحصة، واختار الطلاب اللي هتضيفهم.</DialogDescription>
        </DialogHeader>
        {(error || selectionError) && <p role="alert" className="text-sm text-destructive">{error || selectionError}</p>}
        <form className="grid gap-4" onSubmit={(event) => {
          event.preventDefault();
          if (invalidStudentSelections(students, courseId, selectedStudents).length) {
            setSelectionError("طالب من المختارين مش ملتحق فعليًا بالمقرر أو حسابه مش نشط. راجع اختيار الطلاب.");
            return;
          }
          const form = new FormData(event.currentTarget);
          form.delete("students");
          for (const studentId of selectedStudents) form.append("students", studentId);
          setSelectionError("");
          startTransition(() => submit(form));
        }}>
          <label className="grid gap-2 text-sm font-semibold">اسم المجموعة
            <input className="field" name="name" defaultValue={group?.name} minLength={2} maxLength={160} required />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2 text-sm font-semibold">
              <label htmlFor="learning-group-course">المقرر</label>
              <select className="field" id="learning-group-course" name="course" value={courseId} onChange={(event) => {
                setCourseId(event.target.value);
                setSelectedStudents(new Set());
                setSelectionError("");
                setSearch("");
              }} required>
                <option value="" disabled>اختار المقرر</option>
                {courses.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
              </select>
            </div>
            <div className="grid gap-2 text-sm font-semibold">
              <label htmlFor="learning-group-teacher">المدرس</label>
              <select className="field" id="learning-group-teacher" name="teacher" defaultValue={group?.teacher_id ?? ""} required>
                <option value="" disabled>اختار المدرس</option>
                {teachers.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
              </select>
            </div>
            <label className="grid gap-2 text-sm font-semibold">سعة المجموعة
              <input className="field" type="number" name="capacity" min={Math.max(memberCount, 1)} max={500} defaultValue={group?.capacity ?? 12} required />
            </label>
            <label className="grid gap-2 text-sm font-semibold">سعر الاشتراك بالجنيه
              <input className="field" type="number" name="fee" min={0} max={999999.99} step="0.01" defaultValue={(group?.fee_minor ?? 0) / 100} required />
            </label>
            <div className="grid gap-2 text-sm font-semibold">
              <label htmlFor="learning-group-weekday">يوم المجموعة</label>
              <select className="field" id="learning-group-weekday" name="weekday" defaultValue={group?.weekday ?? ""} required>
                <option value="" disabled>اختار اليوم</option>
                {groupWeekdays.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}
              </select>
            </div>
            <label className="grid gap-2 text-sm font-semibold">الوقت بتوقيت القاهرة
              <input className="field" name="time" type="time" defaultValue={group?.starts_at_local.slice(0, 5)} required />
            </label>
          </div>
          <fieldset className="grid gap-2 rounded-lg border p-3">
            <legend className="px-1 text-sm font-bold">إضافة طلاب</legend>
            {group && <p className="text-sm text-muted-foreground">الطلاب المسجّلون حاليًا: {memberCount}</p>}
            {!courseId ? <p className="text-sm text-muted-foreground">اختار المقرر لعرض الطلاب الملتحقين به.</p> : availableStudents.length ? <>
              <input aria-label="ابحث باسم الطالب" className="field" type="search" placeholder="ابحث باسم الطالب"
                value={search} onChange={(event) => setSearch(event.target.value)} />
              <div className="max-h-44 overflow-y-auto">
                {availableStudents.map(({ id, name }) => (
                  <label key={id} hidden={!name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())}
                    className="min-h-11 items-center gap-2 rounded px-2 text-sm [&:not([hidden])]:flex">
                    <input type="checkbox" name="students" value={id} checked={selectedStudents.has(id)} onChange={(event) => {
                      setSelectionError("");
                      setSelectedStudents((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(id); else next.delete(id);
                        return next;
                      });
                    }} className="size-4 shrink-0 accent-primary" /> {name}
                  </label>
                ))}
              </div>
            </> : <p className="text-sm text-muted-foreground">مفيش طلاب متاحين للإضافة في المقرر ده.</p>}
          </fieldset>
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="active" defaultChecked={group?.active ?? false} className="size-4 accent-primary" />
            عرض المجموعة في صفحة المجموعات الدراسية
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending || !courses.length || !teachers.length}>
              {pending ? "جارٍ الحفظ…" : "حفظ المجموعة"}
            </Button>
            {group && <Button variant="outline" asChild><Link href="/admin/group-requests">رجوع للمجموعات</Link></Button>}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
