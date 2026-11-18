import {
  courses,
  getCourse,
  getGrade,
  getSubject,
  getTeacher,
} from "./mock-data";
import type { CatalogQuery, CatalogService } from "./types";

export const normalizeArabic = (value: string) =>
  value
    .toLocaleLowerCase("ar-EG")
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670ـ]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .trim();

export function filterCourses({
  query = "",
  grade,
  subject,
}: CatalogQuery = {}) {
  const needle = normalizeArabic(query);
  return courses.filter(
    (course) =>
      (!grade || course.gradeId === grade) &&
      (!subject || course.subjectId === subject) &&
      normalizeArabic(
        [
          course.title,
          getSubject(course.subjectId)?.name,
          getGrade(course.gradeId)?.name,
          getTeacher(course.teacherId)?.name,
        ].join(" "),
      ).includes(needle),
  );
}

// Replace this adapter with a reviewed frontend service when integration is authorized.
// This module never opens network connections or handles credentials.
export const catalogService: CatalogService = {
  async listCourses(query) {
    return filterCourses(query);
  },
  async getCourse(id) {
    return getCourse(id);
  },
};
