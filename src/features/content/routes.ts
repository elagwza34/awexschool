export type CourseReaderRole = "teacher" | "student" | "parent" | "admin";
export function portalCourseHref(
  role: CourseReaderRole,
  courseId: string,
  studentId?: string,
  lessonId?: string,
) {
  const params = new URLSearchParams();
  if (role === "parent" && studentId) params.set("student", studentId);
  if (lessonId) params.set("lesson", lessonId);
  return `/${role}/learn/${encodeURIComponent(courseId)}${params.size ? `?${params}` : ""}`;
}
