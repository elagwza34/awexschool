"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { grades, getSubject } from "@/features/catalog/mock-data";
import { courseTrackLabels, type CourseTrack } from "@/features/catalog/types";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import { usePermissions } from "@/features/dashboards/permissions-context";
import { useContent } from "./context";
import { ContentField, moveContent } from "./fields";
import type {
  ContentCourse,
  ContentLesson,
  ContentRecord,
  ContentRole,
} from "./types";

export function ContentEditor({
  record,
  role,
  defaults,
}: {
  record?: ContentRecord;
  role: ContentRole;
  defaults?: Pick<ContentCourse, "gradeId" | "track" | "teacherId">;
}) {
  const registry = useEnrollmentPreview();
  const { can } = usePermissions();
  const { save } = useContent();
  const teacherId = defaults?.teacherId ?? "ahmed-hassan";
  const fresh = (): ContentCourse => ({
    id: crypto.randomUUID(),
    title: "",
    description: "",
    gradeId: defaults?.gradeId ?? "preparatory-1",
    track: defaults?.track ?? "arabic",
    teacherId,
    subjectId: registry.teacherSubjects[teacherId],
    term: "الفصل الدراسي الأول",
    units: [],
  });
  // Creation is deferred until opening, keeping server and client markup stable.
  const [draft, setDraft] = useState<ContentCourse | null>(null),
    [open, setOpen] = useState(false),
    [error, setError] = useState("");
  const [revision, setRevision] = useState<number>();
  const updateLesson = (
    unitId: string,
    lessonId: string,
    change: Partial<ContentLesson>,
  ) =>
    setDraft(
      (previous) =>
        previous && {
          ...previous,
          units: previous.units.map((u) =>
            u.id !== unitId
              ? u
              : {
                  ...u,
                  lessons: u.lessons.map((l) =>
                    l.id === lessonId ? { ...l, ...change } : l,
                  ),
                },
          ),
        },
    );
  const enabled =
    role === "admin"
      ? registry.isEntityActive("admin", "preview-admin")
      : role !== "teacher" || registry.isEntityActive("teacher", "ahmed-hassan");
  if (!can(role, record ? "content:edit" : "content:create")) return null;
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        setError("");
        if (value) {
          setDraft(record ? structuredClone(record.working) : fresh());
          setRevision(record?.revision);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant={record ? "outline" : "default"}
          disabled={!enabled || record?.status === "review"}
        >
          {record ? "تعديل المحتوى" : "إنشاء مقرر"}
        </Button>
      </DialogTrigger>
      <DialogContent
        dir="rtl"
        className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"
      >
        <DialogHeader>
          <DialogTitle>
            {record ? "تعديل محتوى المقرر" : "إنشاء مقرر جديد"}
          </DialogTitle>
          <DialogDescription>
            حفظ مسودة محلية فقط. النشر يحتاج إرسالًا للمراجعة وموافقة الإدارة في
            المحاكاة. إغلاق المحرر يتجاهل التعديلات غير المحفوظة.
          </DialogDescription>
        </DialogHeader>
        {draft && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const result = save(draft, role, revision);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setOpen(false);
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <ContentField label="عنوان المقرر">
                <input
                  className="field"
                  required
                  minLength={3}
                  maxLength={160}
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                />
              </ContentField>
              <ContentField label="صف المقرر">
                <select
                  className="field"
                  disabled={!!record}
                  value={draft.gradeId}
                  onChange={(e) =>
                    setDraft({ ...draft, gradeId: e.target.value })
                  }
                >
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </ContentField>
              <ContentField label="مسار المقرر">
                <select
                  className="field"
                  value={draft.track ?? "arabic"}
                  onChange={(e) =>
                    setDraft({ ...draft, track: e.target.value as CourseTrack })
                  }
                >
                  {Object.entries(courseTrackLabels).map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </ContentField>
              <ContentField label="مدرس المقرر">
                <select
                  className="field"
                  disabled={!!record || role === "teacher"}
                  value={draft.teacherId}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      teacherId: e.target.value,
                      subjectId: registry.teacherSubjects[e.target.value],
                    })
                  }
                >
                  {registry.accounts
                    .filter((a) => a.kind === "teacher" && registry.teacherSubjects[a.entityId])
                    .map((a) => (
                      <option key={a.id} value={a.entityId}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </ContentField>
              <ContentField label="الفصل الدراسي">
                <input
                  className="field"
                  required
                  maxLength={80}
                  value={draft.term}
                  onChange={(e) => setDraft({ ...draft, term: e.target.value })}
                />
              </ContentField>
            </div>
            <p className="text-sm text-muted-foreground">
              المادة: {getSubject(draft.subjectId)?.name}. المدرس مرتبط بمادة
              واحدة. المدرس والمادة والصف ثابتون بعد الإنشاء.
            </p>
            <ContentField label="وصف المقرر">
              <textarea
                className="field min-h-24"
                required
                minLength={10}
                maxLength={3000}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </ContentField>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold">الوحدات والدروس</h3>
              <Button
                type="button"
                variant="outline"
                disabled={draft.units.length >= 30}
                onClick={() =>
                  setDraft({
                    ...draft,
                    units: [
                      ...draft.units,
                      {
                        id: crypto.randomUUID(),
                        title: "وحدة جديدة",
                        lessons: [],
                      },
                    ],
                  })
                }
              >
                إضافة وحدة
              </Button>
            </div>
            {draft.units.map((unit, unitIndex) => (
              <details key={unit.id} className="rounded-lg border p-3">
                <summary className="min-h-11 cursor-pointer text-sm font-bold leading-7">
                  {unitIndex + 1}. {unit.title} · {unit.lessons.length} دروس
                </summary>
                <div className="space-y-3 pt-3">
                  <ContentField label="عنوان الوحدة">
                    <input
                      className="field"
                      maxLength={160}
                      value={unit.title}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          units: draft.units.map((u) =>
                            u.id === unit.id
                              ? { ...u, title: e.target.value }
                              : u,
                          ),
                        })
                      }
                    />
                  </ContentField>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!unitIndex}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          units: moveContent(draft.units, unitIndex, -1),
                        })
                      }
                    >
                      رفع الوحدة
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={unitIndex === draft.units.length - 1}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          units: moveContent(draft.units, unitIndex, 1),
                        })
                      }
                    >
                      خفض الوحدة
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          units: draft.units.filter((u) => u.id !== unit.id),
                        })
                      }
                    >
                      حذف الوحدة من المسودة
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={unit.lessons.length >= 50}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          units: draft.units.map((u) =>
                            u.id === unit.id
                              ? {
                                  ...u,
                                  lessons: [
                                    ...u.lessons,
                                    {
                                      id: crypto.randomUUID(),
                                      title: "درس جديد",
                                      minutes: 15,
                                      body: "",
                                      objectives: [],
                                      resources: [],
                                    },
                                  ],
                                }
                              : u,
                          ),
                        })
                      }
                    >
                      إضافة درس
                    </Button>
                  </div>
                  {unit.lessons.map((lesson, lessonIndex) => (
                    <details key={lesson.id} className="rounded-md border p-3">
                      <summary className="min-h-11 cursor-pointer text-sm font-semibold leading-7">
                        {lessonIndex + 1}. {lesson.title}
                      </summary>
                      <div className="space-y-3 pt-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <ContentField label="عنوان الدرس">
                            <input
                              className="field"
                              maxLength={160}
                              value={lesson.title}
                              onChange={(e) =>
                                updateLesson(unit.id, lesson.id, {
                                  title: e.target.value,
                                })
                              }
                            />
                          </ContentField>
                          <ContentField label="مدة الدرس بالدقائق">
                            <input
                              type="number"
                              className="field"
                              min={1}
                              max={240}
                              step={1}
                              value={lesson.minutes}
                              onChange={(e) =>
                                updateLesson(unit.id, lesson.id, {
                                  minutes: Number(e.target.value),
                                })
                              }
                            />
                          </ContentField>
                        </div>
                        <ContentField label="أهداف الدرس (هدف في كل سطر)">
                          <textarea
                            className="field"
                            value={lesson.objectives.join("\n")}
                            onChange={(e) =>
                              updateLesson(unit.id, lesson.id, {
                                objectives: e.target.value.split("\n"),
                              })
                            }
                          />
                        </ContentField>
                        <ContentField label="نص الدرس">
                          <textarea
                            className="field min-h-40"
                            maxLength={20000}
                            value={lesson.body}
                            onChange={(e) =>
                              updateLesson(unit.id, lesson.id, {
                                body: e.target.value,
                              })
                            }
                          />
                        </ContentField>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!lessonIndex}
                            onClick={() =>
                              setDraft({
                                ...draft,
                                units: draft.units.map((u) =>
                                  u.id === unit.id
                                    ? {
                                        ...u,
                                        lessons: moveContent(
                                          u.lessons,
                                          lessonIndex,
                                          -1,
                                        ),
                                      }
                                    : u,
                                ),
                              })
                            }
                          >
                            رفع الدرس
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={lessonIndex === unit.lessons.length - 1}
                            onClick={() =>
                              setDraft({
                                ...draft,
                                units: draft.units.map((u) =>
                                  u.id === unit.id
                                    ? {
                                        ...u,
                                        lessons: moveContent(
                                          u.lessons,
                                          lessonIndex,
                                          1,
                                        ),
                                      }
                                    : u,
                                ),
                              })
                            }
                          >
                            خفض الدرس
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                units: draft.units.map((u) =>
                                  u.id === unit.id
                                    ? {
                                        ...u,
                                        lessons: u.lessons.filter(
                                          (l) => l.id !== lesson.id,
                                        ),
                                      }
                                    : u,
                                ),
                              })
                            }
                          >
                            حذف الدرس من المسودة
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          الموارد أسماء ومراجع تجريبية؛ بدون رفع أو تحميل أو
                          تشغيل فعلي.
                        </p>
                        {lesson.resources.map((resource) => (
                          <div
                            key={resource.id}
                            className="grid gap-3 rounded-md border p-3 sm:grid-cols-2"
                          >
                            <ContentField label="عنوان المورد">
                              <input
                                className="field"
                                maxLength={160}
                                value={resource.title}
                                onChange={(e) =>
                                  updateLesson(unit.id, lesson.id, {
                                    resources: lesson.resources.map((r) =>
                                      r.id === resource.id
                                        ? { ...r, title: e.target.value }
                                        : r,
                                    ),
                                  })
                                }
                              />
                            </ContentField>
                            <ContentField label="نوع المورد">
                              <select
                                className="field"
                                value={resource.kind}
                                onChange={(e) =>
                                  updateLesson(unit.id, lesson.id, {
                                    resources: lesson.resources.map((r) =>
                                      r.id === resource.id
                                        ? {
                                            ...r,
                                            kind: e.target
                                              .value as typeof r.kind,
                                          }
                                        : r,
                                    ),
                                  })
                                }
                              >
                                <option value="pdf">ملف PDF</option>
                                <option value="video">فيديو</option>
                                <option value="link">رابط</option>
                              </select>
                            </ContentField>
                            <ContentField label="مرجع المورد">
                              <input
                                className="field"
                                maxLength={500}
                                value={resource.reference}
                                onChange={(e) =>
                                  updateLesson(unit.id, lesson.id, {
                                    resources: lesson.resources.map((r) =>
                                      r.id === resource.id
                                        ? { ...r, reference: e.target.value }
                                        : r,
                                    ),
                                  })
                                }
                              />
                            </ContentField>
                            <Button
                              type="button"
                              variant="outline"
                              className="self-end"
                              onClick={() =>
                                updateLesson(unit.id, lesson.id, {
                                  resources: lesson.resources.filter(
                                    (r) => r.id !== resource.id,
                                  ),
                                })
                              }
                            >
                              حذف المورد من المسودة
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          disabled={lesson.resources.length >= 20}
                          onClick={() =>
                            updateLesson(unit.id, lesson.id, {
                              resources: [
                                ...lesson.resources,
                                {
                                  id: crypto.randomUUID(),
                                  title: "",
                                  kind: "pdf",
                                  reference: "",
                                },
                              ],
                            })
                          }
                        >
                          إضافة مورد
                        </Button>
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ))}
            <p className="text-xs leading-7 text-muted-foreground">
              الحذف والترتيب يخصان المسودة. النسخة المنشورة تظل كما هي حتى
              اعتماد نسخة جديدة.
            </p>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit">حفظ مسودة المقرر</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                إلغاء التعديلات
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
