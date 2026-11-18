import { courses, getTeacher } from "./mock-data";
import type { SubjectId, Course } from "./types";

export function getTeacherCourses(teacherId: string) {
  return courses.filter((course) => course.teacherId === teacherId);
}

export function teacherSubjectConflict(
  teacherId: string,
  subjectId: SubjectId,
  assignedCourses: ReadonlyArray<Pick<Course, 'subjectId'>> = getTeacherCourses(teacherId),
) {
  if (!getTeacher(teacherId)) return "المدرس غير موجود في بيانات المعاينة.";
  if (assignedCourses.some((course) => course.subjectId !== subjectId)) {
    return "كل مدرس مرتبط بمادة واحدة. لا يمكن حفظ مادة مختلفة عن مادة مقرراته المسندة؛ أعد إسناد المقررات أولًا.";
  }
  return undefined;
}
