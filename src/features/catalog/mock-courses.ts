"use client";

export interface MockCourse {
  id: string;
  title: string;
  code: string;
  description: string;
  teacherId: string;
  teacherName: string;
  grade: string;
  subject: string;
  studentsCount: number;
  status: "published" | "draft" | "archived";
  createdAt: string;
  color: string;
}

export const mockCourses: MockCourse[] = [
  {
    id: "course-1",
    title: "الرياضيات للصف الثاني الثانوي",
    code: "MATH-201",
    description: "دراسة مفصلة للمفاهيم الرياضية المتقدمة",
    teacherId: "user-2",
    teacherName: "أ. أحمد حسن",
    grade: "الثاني الثانوي",
    subject: "رياضيات",
    studentsCount: 25,
    status: "published",
    createdAt: "2026-09-01",
    color: "bg-blue-100 text-blue-700",
  },
  {
    id: "course-2",
    title: "العلوم للصف الثاني الثانوي",
    code: "SCI-202",
    description: "دراسة العلوم الطبيعية والتطبيقية",
    teacherId: "user-3",
    teacherName: "أ. مريم عادل",
    grade: "الثاني الثانوي",
    subject: "علوم",
    studentsCount: 22,
    status: "published",
    createdAt: "2026-09-01",
    color: "bg-green-100 text-green-700",
  },
  {
    id: "course-3",
    title: "اللغة العربية للصف الثاني الثانوي",
    code: "ARA-203",
    description: "دراسة الأدب والنحو العربي",
    teacherId: "user-4",
    teacherName: "أ. عمر سالم",
    grade: "الثاني الثانوي",
    subject: "لغة عربية",
    studentsCount: 28,
    status: "published",
    createdAt: "2026-09-01",
    color: "bg-purple-100 text-purple-700",
  },
  {
    id: "course-4",
    title: "اللغة الإنجليزية للصف الثاني الثانوي",
    code: "ENG-204",
    description: "دراسة اللغة الإنجليزية والمهارات اللغوية",
    teacherId: "user-2",
    teacherName: "أ. أحمد حسن",
    grade: "الثاني الثانوي",
    subject: "لغة إنجليزية",
    studentsCount: 25,
    status: "published",
    createdAt: "2026-09-01",
    color: "bg-orange-100 text-orange-700",
  },
];

export function getMockCourses(): MockCourse[] {
  return mockCourses;
}

export function getCoursesByTeacher(teacherId: string): MockCourse[] {
  return mockCourses.filter((c) => c.teacherId === teacherId);
}

export function getCoursesByStudent(studentId: string): MockCourse[] {
  return mockCourses;
}