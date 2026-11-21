"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { grades, stages, subjects } from "@/features/catalog/mock-data";
import { courseTrackLabels } from "@/features/catalog/types";
import { previewStudentId } from "@/features/dashboards/chat-data";
import { useEnrollmentPreview } from "./context";
import { availableSeats, formatGroupFee, groupDays, holdsSeat } from "./registration";

const timeFormat = new Intl.DateTimeFormat("ar-EG", { timeStyle: "short", timeZone: "Africa/Cairo" });
const emptyFilters = { stage: "", grade: "", subject: "", track: "", day: "" };

export function PublicGroups({ initialGroup = "" }: { initialGroup?: string }) {
  const { groups, catalogCourses, accounts, assignments, isEntityActive, joinRequests, reserveSeat, payReservation } = useEnrollmentPreview();
  const [filters, setFilters] = useState(emptyFilters);
  const [selection, setSelection] = useState(initialGroup);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const student = accounts.find((account) => account.kind === "student" && account.entityId === previewStudentId);
  const listings = groups.flatMap((group) => {
    const course = catalogCourses.find(({ id }) => id === group.courseId);
    const grade = grades.find(({ id }) => id === course?.gradeId);
    const teacher = accounts.find((account) => account.kind === "teacher" && account.entityId === assignments[group.courseId]);
    if (!group.active || !group.day || !group.time || !course || !grade || teacher?.status !== "نشط") return [];
    return [{ group, course, grade, teacher }];
  });
  const visible = listings.filter(({ group, course, grade }) =>
    (!filters.stage || grade.stageId === filters.stage) && (!filters.grade || grade.id === filters.grade) &&
    (!filters.subject || course.subjectId === filters.subject) &&
    (!filters.track || (course.track ?? "arabic") === filters.track) && (!filters.day || group.day === filters.day),
  );
  const selected = listings.find(({ group }) => group.id === selection);
  const request = joinRequests.find((item) => item.groupId === selection && item.studentId === previewStudentId && holdsSeat(item, now));
  const selectedMember = selected?.group.studentIds.includes(previewStudentId);
  const fields = [
    { key: "stage", label: "المرحلة", options: stages },
    { key: "grade", label: "الصف", options: grades.filter((grade) => !filters.stage || grade.stageId === filters.stage) },
    { key: "subject", label: "المادة", options: subjects },
    { key: "track", label: "المسار", options: Object.entries(courseTrackLabels).map(([id, name]) => ({ id, name })) },
    { key: "day", label: "اليوم", options: Object.entries(groupDays).map(([id, name]) => ({ id, name })) },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="soft-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        {fields.map(({ key, label, options }) => (
          <label key={key} className="grid gap-2 text-sm font-semibold">
            {label}
            <select className="field" aria-label={label} value={filters[key]} onChange={(event) => {
              const value = event.target.value;
              setFilters((current) => ({ ...current, ...(key === "stage" ? { grade: "" } : {}), [key]: value }));
            }}>
              <option value="">الكل</option>
              {options.map(({ id, name }) => <option value={id} key={id}>{name}</option>)}
            </select>
          </label>
        ))}
      </div>
      <p role="status" className="text-sm text-muted-foreground">{visible.length} مجموعة</p>
      {!visible.length && (
        <div className="soft-card space-y-3 p-5">
          <p>مفيش مجموعات مطابقة للفلاتر الحالية.</p>
          <Button variant="outline" onClick={() => setFilters(emptyFilters)}>مسح الفلاتر</Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map(({ group, course, grade, teacher }) => {
          const seats = availableSeats(group, joinRequests, now);
          const ownRequest = joinRequests.some((item) => item.groupId === group.id && item.studentId === previewStudentId && holdsSeat(item, now));
          const member = group.studentIds.includes(previewStudentId);
          return (
            <article key={group.id} className="soft-card flex min-w-0 flex-col gap-3 p-4">
              <h2 className="text-lg font-bold break-words">{group.name}</h2>
              <p className="text-sm text-muted-foreground">{subjects.find(({ id }) => id === course.subjectId)?.name} · {grade.name} · {courseTrackLabels[course.track ?? "arabic"]}</p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-muted-foreground">المدرس</dt><dd className="font-semibold">{teacher.name}</dd></div>
                <div><dt className="text-muted-foreground">الموعد</dt><dd className="font-semibold">{groupDays[group.day as keyof typeof groupDays]} <bdi>{group.time}</bdi></dd></div>
                <div><dt className="text-muted-foreground">سعر الاشتراك</dt><dd className="font-semibold">{formatGroupFee(group.fee)}</dd></div>
                <div><dt className="text-muted-foreground">الأماكن المتاحة</dt><dd className="font-semibold">{seats} من {group.capacity}</dd></div>
              </dl>
              <div className="mt-auto pt-2">
                {member ? <Button variant="outline" asChild><Link href="/student/courses">عرض اشتراكك</Link></Button> : (
                  <Button disabled={!seats && !ownRequest} onClick={() => { setSelection(group.id); setError(""); }}>
                    {ownRequest ? "متابعة طلبك" : seats ? "انضم للمجموعة" : "المجموعة مكتملة أو محجوزة"}
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <Dialog open={Boolean(selection)} onOpenChange={(open) => { if (!open) setSelection(""); }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{selected?.group.name ?? "طلب انضمام المجموعة"}</DialogTitle>
            <DialogDescription>التسجيل والدفع تجريبيان بحساب الطالب {student?.name}. العضوية تبدأ بعد موافقة الإدارة.</DialogDescription>
          </DialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {selectedMember ? <p>عضويتك مفعّلة.</p> : request?.status === "paid" ? (
            <p role="status">الدفع التجريبي اتسجل. الطلب بانتظار موافقة الإدارة.</p>
          ) : request ? (
            <>
              <p className="text-sm">مكانك محجوز لحد {timeFormat.format(request.expiresAt)} بتوقيت القاهرة.</p>
              <p className="text-sm font-bold">قيمة الاشتراك {formatGroupFee(request.fee)}</p>
              <Button onClick={() => {
                const result = payReservation(request.id);
                setError(result.ok ? "" : result.error);
              }}>تأكيد الدفع التجريبي</Button>
              <Button variant="outline" onClick={() => setError("محاكاة: الدفع ما تمّش. مكانك لسه محجوز لحد الموعد المكتوب، وتقدر تعيد المحاولة.")}>
                محاكاة فشل الدفع
              </Button>
            </>
          ) : selected ? (
            <>
              <p className="text-sm">احجز المكان لمدة 10 دقايق لإكمال خطوة الدفع التجريبي. الحجز المؤقت بينتهي تلقائيًا لو الدفع ما اتأكدش.</p>
              <p className="text-sm font-bold">قيمة الاشتراك {formatGroupFee(selected.group.fee)}</p>
              <Button disabled={!availableSeats(selected.group, joinRequests, now) || !isEntityActive("student", previewStudentId)} onClick={() => {
                const result = reserveSeat(selection);
                setNow(Date.now());
                setError(result.ok ? "" : result.error);
              }}>احجز مكانك مؤقتًا</Button>
            </>
          ) : <p>المجموعة مش متاحة حاليًا.</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
