import type { Course, Grade, Stage, Subject, Teacher, Unit } from "./types";
import { getPreviewSteps } from "./lesson-fixtures";
import { languageCourses } from "./language-courses";

// Fictional fixtures for UI demonstrations; not official curriculum or commercial claims.
export const stages: Stage[] = [
  {
    id: "kindergarten",
    name: "الحضانة",
    description: "أول خطوة مع الحروف والأرقام والحكايات.",
    tone: "blue",
  },
  {
    id: "primary",
    name: "المرحلة الابتدائية",
    description: "بداية صغيرة، واكتشافات كبيرة. نبني الأساس خطوة بخطوة.",
    tone: "peach",
  },
  {
    id: "preparatory",
    name: "المرحلة الإعدادية",
    description: "نفهم أعمق، ونسأل أكثر. مساحة لتنمية الفضول والثقة.",
    tone: "mint",
  },
  {
    id: "secondary",
    name: "المرحلة الثانوية",
    description: "فهم حقيقي وخطة واضحة، لكل خطوة نحو مستقبلك.",
    tone: "lilac",
  },
];
const ordinals = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"];
export const grades: Grade[] = stages.flatMap((stage) =>
  stage.id === "kindergarten"
    ? ["KG1", "KG2"].map((name, index) => ({
        id: `kindergarten-${index + 1}`,
        stageId: stage.id,
        name,
      }))
    : Array.from({ length: stage.id === "primary" ? 6 : 3 }, (_, i) => ({
        id: `${stage.id}-${i + 1}`,
        stageId: stage.id,
        name: `الصف ${ordinals[i]} ${stage.id === "primary" ? "الابتدائي" : stage.id === "preparatory" ? "الإعدادي" : "الثانوي"}`,
      })),
);
export const subjects: Subject[] = [
  {
    id: "math",
    name: "الرياضيات",
    description: "من الفكرة إلى الحل، نفهم لغة الأرقام.",
    symbol: "∑",
    tone: "mint",
  },
  {
    id: "arabic",
    name: "اللغة العربية",
    description: "نقرأ، نعبّر، ونكتشف جمال لغتنا.",
    symbol: "ض",
    tone: "peach",
  },
  {
    id: "science",
    name: "العلوم",
    description: "أسئلة صغيرة تكشف عالمًا مدهشًا.",
    symbol: "H₂O",
    tone: "blue",
  },
  {
    id: "english",
    name: "اللغة الإنجليزية",
    description: "لغة جديدة، وفرص أوسع للتعبير.",
    symbol: "Aa",
    tone: "lilac",
  },
  {
    id: "physics",
    name: "الفيزياء",
    description: "نفهم القوانين التي تحرّك عالمنا.",
    symbol: "λ",
    tone: "blue",
  },
  {
    id: "history",
    name: "التاريخ",
    description: "نقرأ الماضي لنفهم الحاضر.",
    symbol: "مصر",
    tone: "peach",
  },
];
export const teachers: Teacher[] = [
  {
    id: "ahmed-hassan",
    name: "أحمد حسن",
    initials: "أ ح",
    subjectId: "math",
    title: "مدرس الرياضيات",
    experience: 12,
    tone: "mint",
    bio: "أؤمن أن الرياضيات طريقة للتفكير، وليست قوانين للحفظ. نربط كل فكرة بمثال من حياتنا ونصل للحل معًا.",
  },
  {
    id: "mariam-adel",
    name: "مريم عادل",
    initials: "م ع",
    subjectId: "arabic",
    title: "مدرسة اللغة العربية",
    experience: 9,
    tone: "peach",
    bio: "رحلتنا مع العربية تبدأ بقصة وسؤال. نشرح القواعد من خلال أمثلة واضحة ونمنح القراءة مساحة للفهم والتعبير.",
  },
  {
    id: "omar-salem",
    name: "عمر سالم",
    initials: "ع س",
    subjectId: "science",
    title: "مدرس العلوم",
    experience: 10,
    tone: "blue",
    bio: "كل تجربة فرصة لفهم شيء جديد. نستخدم الرسوم والتطبيقات اليومية لتصبح العلوم أقرب وأسهل.",
  },
  {
    id: "nour-ibrahim",
    name: "نور إبراهيم",
    initials: "ن إ",
    subjectId: "english",
    title: "مدرسة اللغة الإنجليزية",
    experience: 8,
    tone: "lilac",
    bio: "نتعلم اللغة بالممارسة والفضول. نبني مفرداتنا من مواقف يومية ونشرح القواعد بخطوات بسيطة.",
  },
  {
    id: "khaled-ibrahim",
    name: "خالد إبراهيم",
    initials: "خ إ",
    subjectId: "physics",
    title: "مدرس الفيزياء",
    experience: 11,
    tone: "blue",
    bio: "نبدأ من الملاحظة والتجربة لفهم قوانين الفيزياء، ونربط كل قانون بمثال واضح من حياتنا.",
  },
  {
    id: "mahmoud-samir",
    name: "محمود سمير",
    initials: "م س",
    subjectId: "math",
    title: "مدرس الرياضيات",
    experience: 8,
    tone: "mint",
    bio: "أشرح الرياضيات من الأساس، مع أمثلة متدرجة ومساحة للأسئلة. هذا ملف مدرس افتراضي إضافي لنفس المادة.",
  },
];

function makeUnits(courseId: string, subject: Subject): Unit[] {
  const topics: Record<string, string[]> = {
    math: [
      "الأعداد والعمليات عليها",
      "التعبيرات والعلاقات الجبرية",
      "الهندسة والقياس",
    ],
    arabic: ["القراءة وبناء المعنى", "القواعد والتراكيب", "التعبير والكتابة"],
    science: ["المادة من حولنا", "الطاقة والحياة", "البيئة والتوازن"],
    english: [
      "Everyday connections",
      "Stories and ideas",
      "Language in action",
    ],
    physics: ["الكميات والقياس", "الحركة والقوى", "الشغل والطاقة"],
    history: [
      "قراءة المصادر التاريخية",
      "حضارات تركت أثرًا",
      "التغيير عبر الزمن",
    ],
  };
  const courseTopics =
    courseId === "math-primary-4"
      ? ["الأعداد والقيمة المكانية", "العمليات على الأعداد", "الهندسة والقياس"]
      : topics[subject.id];
  return courseTopics.map((title, i) => ({
    id: `${courseId}-u${i + 1}`,
    title,
    lessons: [
      {
        id: `${courseId}-u${i + 1}-l1`,
        title:
          i === 0 && subject.id === "math"
            ? courseId === "math-primary-4"
              ? "القيمة المكانية: لكل رقم مكان"
              : "الأعداد النسبية: الفكرة ببساطة"
            : `مدخل إلى ${title}`,
        minutes: 18 + i * 3,
        preview: i === 0,
        previewSteps:
          i === 0 ? getPreviewSteps(courseId, subject.id) : undefined,
        summary: `نستكشف ${title} من خلال شرح تدريجي وأمثلة مرتبطة بالحياة اليومية. هذا محتوى تعليمي توضيحي لعرض الواجهة، وليس اعتمادًا رسميًا للمنهج.`,
        objectives: [
          "تحديد الفكرة الأساسية وشرحها بكلماتك",
          "ربط المفهوم بمثال من الحياة اليومية",
          "تطبيق الفكرة على مثال مبسط",
        ],
      },
      {
        id: `${courseId}-u${i + 1}-l2`,
        title: "أمثلة محلولة خطوة بخطوة",
        minutes: 24,
        preview: false,
        summary: "نرتب خطوات الحل ونناقش الأخطاء الشائعة.",
        objectives: ["ترتيب خطوات التفكير", "مراجعة الحل وتفسير النتيجة"],
      },
      {
        id: `${courseId}-u${i + 1}-l3`,
        title: "مراجعة أفكار الوحدة",
        minutes: 15,
        preview: false,
        summary: "نراجع أهم أفكار الوحدة في خريطة مبسطة.",
        objectives: ["تلخيص المفاهيم", "تحديد ما يحتاج إلى مراجعة"],
      },
    ],
  }));
}

const arabicCourses: Course[] = [
  {
    id: "math-prep-1",
    title: "الرياضيات.. افهمها بطريقتك",
    gradeId: "preparatory-1",
    subjectId: "math",
    teacherId: "ahmed-hassan",
    price: 249,
  },
  {
    id: "arabic-prep-1",
    title: "العربية.. حكاية ومعنى",
    gradeId: "preparatory-1",
    subjectId: "arabic",
    teacherId: "mariam-adel",
    price: 199,
  },
  {
    id: "science-prep-1",
    title: "العلوم.. اكتشف ما حولك",
    gradeId: "preparatory-1",
    subjectId: "science",
    teacherId: "omar-salem",
    price: 229,
  },
  {
    id: "english-prep-2",
    title: "الإنجليزية.. خطوة بثقة",
    gradeId: "preparatory-2",
    subjectId: "english",
    teacherId: "nour-ibrahim",
    price: 219,
  },
  {
    id: "math-primary-4",
    title: "أصدقاء الأرقام",
    gradeId: "primary-4",
    subjectId: "math",
    teacherId: "ahmed-hassan",
    price: 179,
  },
  {
    id: "arabic-primary-3",
    title: "نقرأ ونحكي",
    gradeId: "primary-3",
    subjectId: "arabic",
    teacherId: "mariam-adel",
    price: 169,
  },
  {
    id: "physics-secondary-2",
    title: "الفيزياء.. من السؤال للفهم",
    gradeId: "secondary-2",
    subjectId: "physics",
    teacherId: "khaled-ibrahim",
    price: 299,
  },
  {
    id: "english-secondary-3",
    title: "لغتك، عالمك، مستقبلك",
    gradeId: "secondary-3",
    subjectId: "english",
    teacherId: "nour-ibrahim",
    price: 279,
  },
].map((item) => {
  const subject = subjects.find((s) => s.id === item.subjectId)!;
  return {
    ...item,
    subjectId: subject.id,
    term: "الفصل الدراسي الأول",
    description: `${subject.description} شرح منظم، وأمثلة واضحة، ومراجعة لكل وحدة تساعدك تذاكر بإيقاعك.`,
    units: makeUnits(item.id, subject),
  };
});

export const courses: Course[] = [...arabicCourses, ...languageCourses];

export const getGrade = (id: string) => grades.find((g) => g.id === id);
export const getSubject = (id: string) => subjects.find((s) => s.id === id);
export const getTeacher = (id: string) => teachers.find((t) => t.id === id);
export const getTeachersForSubject = (subjectId: string) =>
  teachers.filter((teacher) => teacher.subjectId === subjectId);
export const getCourse = (id: string) => courses.find((c) => c.id === id);
export const getLesson = (id: string) => {
  for (const course of courses)
    for (const unit of course.units) {
      const lesson = unit.lessons.find((l) => l.id === id);
      if (lesson) return { course, unit, lesson };
    }
};

// Portal mock data for standalone UI without Supabase
export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: "student" | "teacher" | "parent" | "admin" | "owner";
  status: "active" | "pending" | "disabled";
  avatar?: string;
  phone?: string;
  createdAt: string;
}

export const mockUsers: MockUser[] = [
  { id: "user-1", name: "يوسف أحمد", email: "youssef@school.com", role: "student", status: "active", avatar: "/avatars/youssef.png", createdAt: "2026-01-15" },
  { id: "user-2", name: "أ. أحمد حسن", email: "ahmed@school.com", role: "teacher", status: "active", avatar: "/avatars/ahmed.png", createdAt: "2026-01-10" },
  { id: "user-3", name: "أ. مريم عادل", email: "mariam@school.com", role: "teacher", status: "active", avatar: "/avatars/mariam.png", createdAt: "2026-01-12" },
  { id: "user-4", name: "أ. عمر سالم", email: "omar@school.com", role: "teacher", status: "active", avatar: "/avatars/omar.png", createdAt: "2026-01-14" },
  { id: "user-5", name: "سليمة علي", email: "salma@school.com", role: "student", status: "active", avatar: "/avatars/salma.png", createdAt: "2026-01-20" },
  { id: "user-6", name: "نور إبراهيم", email: "nour@school.com", role: "student", status: "active", avatar: "/avatars/nour.png", createdAt: "2026-01-18" },
  { id: "user-7", name: "أ. فاطمة محمد", email: "fatima@school.com", role: "parent", status: "active", avatar: "/avatars/fatima.png", createdAt: "2026-01-22" },
  { id: "user-8", name: "المدير العام", email: "admin@school.com", role: "admin", status: "active", avatar: "/avatars/admin.png", createdAt: "2026-01-05" },
];

export function getMockUsers(): MockUser[] {
  return mockUsers;
}

export function getUserById(id: string): MockUser | undefined {
  return mockUsers.find((u) => u.id === id);
}

// Courses mock
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

// Enrollments mock
export interface MockEnrollment {
  id: string;
  course_id: string;
  learner_name: string;
  status: "active" | "pending" | "declined";
  created_at: string;
}

export const mockEnrollments: MockEnrollment[] = [
  { id: "enroll-1", course_id: "course-1", learner_name: "يوسف أحمد", status: "active", created_at: "2026-09-01" },
  { id: "enroll-2", course_id: "course-2", learner_name: "يوسف أحمد", status: "active", created_at: "2026-09-01" },
  { id: "enroll-3", course_id: "course-3", learner_name: "يوسف أحمد", status: "active", created_at: "2026-09-01" },
];

export function getMockEnrollments(): MockEnrollment[] {
  return mockEnrollments;
}
