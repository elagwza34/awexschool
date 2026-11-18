import type { ContentCourse } from "./types";
export const contentStatuses = {
  draft: "مسودة",
  review: "بانتظار المراجعة",
  changes: "تعديلات مطلوبة",
  published: "منشور تجريبيًا",
};
export function validateContent(
  course: ContentCourse,
  publishing = false,
): string | undefined {
  if (course.title.trim().length < 3 || course.title.trim().length > 160)
    return "عنوان المقرر من 3 إلى 160 حرفًا.";
  if (
    course.description.trim().length < 10 ||
    course.description.trim().length > 3000
  )
    return "وصف المقرر من 10 إلى 3000 حرف.";
  if (!course.term.trim() || course.term.length > 80)
    return "اكتب الفصل الدراسي، بحد أقصى 80 حرفًا.";
  if (course.units.length > 30) return "الحد الأقصى 30 وحدة في المعاينة.";
  if (publishing && !course.units.length)
    return "أضف وحدة واحدة على الأقل قبل المراجعة.";
  const ids = new Set<string>();
  for (const unit of course.units) {
    if (!unit.id || ids.has(unit.id)) return "معرّفات المحتوى مكررة.";
    ids.add(unit.id);
    if (unit.title.trim().length < 3 || unit.title.length > 160)
      return "عنوان كل وحدة من 3 إلى 160 حرفًا.";
    if (unit.lessons.length > 50) return "الحد الأقصى 50 درسًا لكل وحدة.";
    if (publishing && !unit.lessons.length)
      return "أضف درسًا لكل وحدة قبل المراجعة.";
    for (const lesson of unit.lessons) {
      if (!lesson.id || ids.has(lesson.id)) return "معرّفات المحتوى مكررة.";
      ids.add(lesson.id);
      if (lesson.title.trim().length < 3 || lesson.title.length > 160)
        return "عنوان كل درس من 3 إلى 160 حرفًا.";
      if (
        !Number.isInteger(lesson.minutes) ||
        lesson.minutes < 1 ||
        lesson.minutes > 240
      )
        return "مدة الدرس من 1 إلى 240 دقيقة.";
      if (
        lesson.body.length > 20000 ||
        lesson.objectives.length > 20 ||
        lesson.objectives.some((o) => o.length > 300)
      )
        return "راجع طول نص الدرس وأهدافه؛ 20000 حرف و20 هدفًا بحد أقصى.";
      if (
        publishing &&
        (lesson.body.trim().length < 10 ||
          !lesson.objectives.some((o) => o.trim()))
      )
        return "أكمل نص كل درس (10 أحرف على الأقل) وأضف هدفًا تعليميًا.";
      if (lesson.resources.length > 20) return "الحد الأقصى 20 موردًا لكل درس.";
      for (const resource of lesson.resources) {
        if (!resource.id || ids.has(resource.id))
          return "معرّفات المحتوى مكررة.";
        ids.add(resource.id);
        if (
          !["pdf", "video", "link"].includes(resource.kind) ||
          resource.title.trim().length < 3 ||
          resource.title.length > 160 ||
          !resource.reference.trim() ||
          resource.reference.length > 500
        )
          return "أكمل عنوان ونوع ومرجع كل مورد.";
        if (resource.kind === "link") {
          try {
            const url = new URL(resource.reference);
            if (url.protocol !== "https:")
              return "روابط الموارد تبدأ بـ https:// فقط.";
          } catch {
            return "اكتب رابط مورد صحيحًا يبدأ بـ https://.";
          }
        }
      }
    }
  }
}
