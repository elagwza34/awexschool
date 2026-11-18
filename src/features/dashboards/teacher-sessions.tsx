"use client";
import { useEnrollmentPreview } from "@/features/enrollments/context";

import Link from "next/link";
import { useState } from "react";
import { CalendarPlus, Check, Link2, Video } from "lucide-react";
import { Badge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getGrade } from "@/features/catalog/mock-data";
import { Panel } from "./dashboard-panels";
import { curriculumOptions, providerNames } from "./management-fixtures";
import type {
  MeetingProvider,
  SessionDraft,
  SessionPreview,
} from "./management-types";
import { usePortalPreview } from "./preview-context";
import { SessionControls } from "@/features/sessions/controls";

function MeetingOutcome({ session }: { session: SessionPreview }) {
  if (session.status === "cancelled")
    return (
      <div className="rounded-lg border bg-muted p-4 text-sm">
        الحصة ملغاة: {session.cancellationReason}. لا يوجد اجتماع فعلي أو دعوات
        مرسلة.
      </div>
    );
  return (
    <div className="rounded-xl border bg-secondary/50 p-4 text-sm">
      <p className="font-bold">
        {session.meetingStatus === "simulated"
          ? "تم تجهيز نموذج الاجتماع"
          : session.meetingStatus === "awaiting_connection"
            ? "الحصة بدون اجتماع — محاكاة الربط غير مفعّلة"
            : "الحصة بدون اجتماع — الإنشاء التلقائي متوقف"}
      </p>
      {session.meetingReference && (
        <p className="my-3 break-all font-mono text-xs" dir="ltr">
          {session.meetingReference}
        </p>
      )}
      <p className="mt-2 text-xs leading-7 text-muted-foreground">
        {session.meetingStatus === "simulated"
          ? "هذا معرّف محاكاة، وليس رابط انضمام. لم يتم إنشاء اجتماع لدى Google أو Zoom."
          : "يمكن تفعيل محاكاة الربط والإنشاء التلقائي من إعدادات الإدارة للحصص الجديدة. الحصة الحالية لم تنشئ اجتماعًا."}
      </p>
    </div>
  );
}

export function TeacherSessions() {
  const {
    getTeacherCourses,
    resolveCourse,
    isEntityActive,
    groups,
    assignments,
  } = useEnrollmentPreview();
  const assignedCourses = getTeacherCourses("ahmed-hassan");
  const { teacherProfile, providers, sessions, createSession } =
    usePortalPreview();
  const [draft, setDraft] = useState<SessionDraft>({
    title: "",
    courseId: assignedCourses[0]?.id ?? "",
    groupId: groups.find(
      (group) => group.active && group.courseId === assignedCourses[0]?.id,
    )?.id,
    date: "2026-11-16",
    time: "17:00",
    duration: providers["google-meet"].defaultDuration,
    provider: "google-meet",
    description: "",
  });
  const [error, setError] = useState("");
  const [created, setCreated] = useState<SessionPreview | null>(null);
  const settings = providers[draft.provider];
  const name = providerNames[draft.provider];
  const availableGroups = groups.filter(
    (group) =>
      group.active &&
      group.courseId === draft.courseId &&
      assignments[group.courseId] === "ahmed-hassan",
  );
  const update = <K extends keyof SessionDraft>(
    key: K,
    value: SessionDraft[K],
  ) => {
    setDraft((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "courseId"
        ? {
            groupId:
              groups.find((group) => group.active && group.courseId === value)
                ?.id ?? "",
          }
        : {}),
    }));
    setError("");
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel
          title="إنشاء حصة جديدة"
          subtitle="تجربة محلية لا تنشئ موعدًا أو دعوة خارج المنصة"
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (draft.title.trim().length < 3) {
                setError("اكتب عنوانًا واضحًا من ثلاثة أحرف على الأقل.");
                return;
              }
              const [hours, mins] = draft.time.split(":").map(Number);
              if (hours * 60 + mins + draft.duration > 1440) {
                setError(
                  "اختار موعدًا تنتهي فيه الحصة في اليوم نفسه لهذه المعاينة.",
                );
                return;
              }
              const result = createSession(draft);
              if (result.error) {
                setError(result.error);
                return;
              }
              setError("");
              setCreated(result.session ?? null);
              setDraft({ ...draft, title: "", description: "" });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="session-title">عنوان الحصة</Label>
              <Input
                id="session-title"
                value={draft.title}
                onChange={(e) => update("title", e.target.value)}
                required
                minLength={3}
                maxLength={140}
                className="min-h-11 rounded-xl"
                placeholder="مثال: نفهم الأعداد النسبية معًا"
              />
            </div>
            <div>
              <Label htmlFor="session-group">مجموعة الحصة</Label>
              <select
                id="session-group"
                className="field mt-2"
                value={draft.groupId ?? ""}
                onChange={(event) => update("groupId", event.target.value)}
                required
              >
                <option value="" disabled>
                  اختر مجموعة مفعّلة
                </option>
                {availableGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="session-course">المقرر المسند</Label>
                <select
                  id="session-course"
                  className="field"
                  value={draft.courseId}
                  onChange={(e) => update("courseId", e.target.value)}
                >
                  {assignedCourses.map((course) => (
                    <option value={course.id} key={course.id}>
                      {course.title} — {getGrade(course.gradeId)?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-provider">منصة الاجتماع</Label>
                <select
                  id="session-provider"
                  className="field"
                  value={draft.provider}
                  onChange={(e) => {
                    const provider = e.target.value as MeetingProvider;
                    setDraft({
                      ...draft,
                      provider,
                      duration: providers[provider].defaultDuration,
                    });
                    setError("");
                  }}
                >
                  <option value="google-meet">Google Meet</option>
                  <option value="zoom">Zoom</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-date">تاريخ الحصة</Label>
                <Input
                  id="session-date"
                  type="date"
                  dir="ltr"
                  required
                  value={draft.date}
                  onChange={(e) => update("date", e.target.value)}
                  className="min-h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-time">وقت البداية — القاهرة</Label>
                <Input
                  id="session-time"
                  type="time"
                  dir="ltr"
                  required
                  value={draft.time}
                  onChange={(e) => update("time", e.target.value)}
                  className="min-h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-duration">مدة الحصة بالدقائق</Label>
                <Input
                  id="session-duration"
                  type="number"
                  min={15}
                  max={240}
                  step={15}
                  required
                  value={draft.duration}
                  onChange={(e) =>
                    update(
                      "duration",
                      e.target.value === "" ? 0 : Number(e.target.value),
                    )
                  }
                  className="min-h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-description">وصف الحصة (اختياري)</Label>
              <textarea
                id="session-description"
                className="field min-h-28 py-3"
                value={draft.description}
                maxLength={1000}
                onChange={(e) => update("description", e.target.value)}
              />
            </div>
            <div className="rounded-xl border bg-secondary/50 p-4 text-xs leading-7">
              <p className="font-bold">المستضيف: {settings.hostName}</p>
              <p className="mt-1 break-all text-muted-foreground">
                <bdi>{settings.hostEmail}</bdi>
              </p>
              <p className="mt-2 text-muted-foreground">
                {settings.demoEnabled && settings.autoCreate
                  ? `سيُضاف نموذج اجتماع ${name} تلقائيًا لهذه الحصة.`
                  : !settings.demoEnabled
                    ? "سيُعرض نموذج الحصة بدون اجتماع لأن محاكاة الربط غير مفعّلة."
                    : "سيُعرض نموذج الحصة بدون اجتماع لأن الإنشاء التلقائي متوقف."}
              </p>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={
                !assignedCourses.length ||
                !isEntityActive("teacher", "ahmed-hassan")
              }
            >
              <CalendarPlus aria-hidden="true" />
              إنشاء الحصة التجريبية
            </Button>
            <p className="text-xs leading-7 text-muted-foreground">
              كل المواعيد بتوقيت القاهرة (Africa/Cairo). الحفظ مؤقت، ولا تُرسل
              دعوات للطلاب.
            </p>
          </form>
        </Panel>
        <div className="space-y-4">
          <Panel
            title="حالة ربط الاجتماعات"
            subtitle="الحالة الحقيقية: لا يوجد مزود متصل"
          >
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
              <Video aria-hidden="true" />
            </div>
            <h2 className="font-bold">{name}</h2>
            <div className="my-4 flex flex-wrap gap-2">
              <Badge>
                {settings.demoEnabled ? "المحاكاة مفعّلة" : "المحاكاة غير مفعّلة"}
              </Badge>
              <Badge className="bg-muted text-muted-foreground">
                {settings.autoCreate
                  ? "الإنشاء التلقائي مفعّل في النموذج"
                  : "الإنشاء التلقائي متوقف"}
              </Badge>
            </div>
            <p className="mb-4 text-xs leading-7 text-muted-foreground">
              إعدادات الاستضافة في لوحة الإدارة تتحكم في نموذج الاجتماع المضاف
              للحصة الجديدة.
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/admin/integrations">
                <Link2 aria-hidden="true" />
                إعداد محاكاة Meet وZoom
              </Link>
            </Button>
          </Panel>
          <Panel title="قبل ما تنشئ الحصة">
            <ul className="space-y-4 text-xs leading-7 text-muted-foreground">
              {[
                "المقرر من قائمة المقررات المسندة في المعاينة.",
                "لا يمكن حجز حصتين متداخلتين في المواعيد التي أنشأتها في التجربة.",
                "تعديل إعدادات المزود لا يغيّر الحصص السابقة.",
                "ملفك ومنهجك الحاليان يظهران في المعاينة المهنية.",
              ].map((text) => (
                <li key={text} className="flex gap-2">
                  <Check
                    aria-hidden="true"
                    className="mt-1.5 size-3.5 shrink-0 text-primary"
                  />
                  {text}
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t pt-4 text-xs text-muted-foreground">
              {teacherProfile.displayName} ·{" "}
              {
                curriculumOptions.find(
                  (c) => c.id === teacherProfile.curriculumId,
                )?.name
              }
            </p>
          </Panel>
        </div>
      </div>
      <Panel
        title="الحصص التي أنشأتها في المعاينة"
        subtitle="تظهر أثناء التنقّل بين اللوحات وتختفي عند تحديث الصفحة"
      >
        {sessions.length ? (
          <div className="space-y-4">
            {sessions.map((session) => (
              <article
                key={session.id}
                className="grid gap-3 rounded-xl border p-4 md:grid-cols-2"
              >
                <div>
                  <Badge>{providerNames[session.provider]}</Badge>
                  <h3 className="mb-2 mt-3 font-semibold">{session.title}</h3>
                  <p className="mb-2 text-sm">
                    {session.groupName} ·{" "}
                    {session.status === "cancelled" ? "ملغاة" : "مجدولة"}
                  </p>
                  {session.cancellationReason && (
                    <p className="mb-2 text-sm">
                      سبب الإلغاء: {session.cancellationReason}
                    </p>
                  )}
                  <SessionControls session={session} />
                  <p className="text-xs leading-7 text-muted-foreground">
                    {resolveCourse(session.courseId)?.title}
                  </p>
                  <p className="my-2 text-xs text-muted-foreground">
                    <bdi>{session.date}</bdi> · <bdi>{session.time}</bdi> ·{" "}
                    {session.duration} دقيقة · القاهرة
                  </p>
                  <p className="text-xs text-muted-foreground">
                    المستضيف في النموذج: {session.hostName}
                  </p>
                </div>
                <MeetingOutcome session={session} />
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
            لسه مفيش حصص في التجربة. ابدأ بإنشاء حصة من النموذج.
          </p>
        )}
      </Panel>
      <Dialog
        open={!!created}
        onOpenChange={(open) => {
          if (!open) setCreated(null);
        }}
      >
        <DialogContent dir="rtl">
          <DialogHeader className="text-start">
            <DialogTitle>تم إنشاء نموذج الحصة</DialogTitle>
            <DialogDescription className="leading-7">
              تمت إضافتها إلى المعاينة المؤقتة فقط. لم يُنشأ حدث في التقويم، ولم
              يتم إرسال أي دعوة.
            </DialogDescription>
          </DialogHeader>
          {created && <MeetingOutcome session={created} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
