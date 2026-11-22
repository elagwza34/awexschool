import { staffProfiles } from "./staff-data";
import type {
  DashboardProfile,
  DemoChild,
  DemoUser,
  LearningCourse,
  ReviewItem,
  ScheduleItem,
  TimelineItem,
  WeeklyActivity,
} from "./types";

// All dashboard identities, activity, counters and schedules are fictional UI fixtures.
export const dashboardProfiles: DashboardProfile[] = [
  ...staffProfiles,
  {
    role: "student",
    label: "لوحة الطالب",
    name: "يوسف أحمد",
    initials: "ي أ",
    subtitle: "الصف الأول الإعدادي",
    greeting: "أهلًا يا يوسف، جاهز لفكرة جديدة؟",
    description:
      "خطوات صغيرة كل يوم، بتعمل فرق كبير. كمّل رحلتك من آخر فكرة وقفت عندها.",
    tone: "mint",
    metrics: [
      {
        label: "مقرراتي",
        value: "٣",
        note: "كل مادة، فرصة جديدة",
        icon: "courses",
        tone: "mint",
      },
      {
        label: "دروس أكملتها",
        value: "١٢",
        note: "من أصل ٢٧ درسًا",
        icon: "complete",
        tone: "blue",
      },
      {
        label: "وقت التعلّم",
        value: "١٤٠ دقيقة",
        note: "في الأسبوع التوضيحي",
        icon: "time",
        tone: "peach",
      },
      {
        label: "أيام نشطة",
        value: "٦ أيام",
        note: "في الأسبوع التوضيحي",
        icon: "review",
        tone: "lilac",
      },
    ],
  },
  {
    role: "teacher",
    label: "لوحة المدرس",
    name: "أ. أحمد حسن",
    initials: "أ ح",
    subtitle: "مدرس الرياضيات",
    greeting: "صباح الأفكار الجديدة، أستاذ أحمد",
    description:
      "مكان واحد لمتابعة مقرراتك، تنظيم محتواك، والاطمئنان على خطوات طلابك.",
    tone: "peach",
    metrics: [
      {
        label: "المقررات المسندة",
        value: "٢",
        note: "الإعدادي والابتدائي",
        icon: "courses",
        tone: "mint",
      },
      {
        label: "طلاب المجموعات",
        value: "٤٨",
        note: "بيانات طلاب افتراضية",
        icon: "students",
        tone: "blue",
      },
      {
        label: "بانتظار مراجعتك",
        value: "٣",
        note: "نماذج واجبات توضيحية",
        icon: "review",
        tone: "peach",
      },
      {
        label: "دروس المقررات",
        value: "١٨",
        note: "٦ وحدات تعليمية",
        icon: "complete",
        tone: "lilac",
      },
    ],
  },
  {
    role: "parent",
    label: "لوحة ولي الأمر",
    name: "أ. أحمد محمود",
    initials: "أ م",
    subtitle: "ولي أمر · طفلان في المعاينة",
    greeting: "قريب من رحلتهم، خطوة بخطوة",
    description:
      "نظرة هادئة على تعلّم أبنائك، والأفكار اللي اكتشفوها، والخطوة اللي محتاجين فيها تشجيعك.",
    tone: "blue",
    metrics: [],
  },
  {
    role: "admin",
    label: "لوحة الإدارة",
    name: "سارة علي",
    initials: "س ع",
    subtitle: "إدارة المنصة · عرض تجريبي",
    greeting: "كل تفاصيل المنصة، في صورة أوضح",
    description:
      "تابع المحتوى والمستخدمين وطلبات المراجعة من مساحة منظمة. كل الأرقام هنا أمثلة للمعاينة.",
    tone: "lilac",
    metrics: [
      {
        label: "مستخدمو المعاينة",
        value: "٦",
        note: "طلاب وأولياء أمور وفريق عمل",
        icon: "students",
        tone: "mint",
      },
      {
        label: "المقررات المتاحة",
        value: "٨",
        note: "في الكتالوج التجريبي",
        icon: "courses",
        tone: "blue",
      },
      {
        label: "طلبات محتوى معلقة",
        value: "٢",
        note: "تحتاج إلى مراجعة",
        icon: "review",
        tone: "peach",
      },
      {
        label: "ملفات المدرسين",
        value: "٦",
        note: "شخصيات افتراضية",
        icon: "teachers",
        tone: "lilac",
      },
    ],
  },
  {
    role: "owner",
    label: "لوحة الإدارة",
    name: "المالك",
    initials: "م",
    subtitle: "المالك العام للمنصة",
    greeting: "مرحبًا بك في لوحة الإدارة",
    description:
      "إدارة الحسابات والمحتوى والطلبات والإعدادات العامة للمنصة من مساحة واحدة.",
    tone: "mint",
    metrics: [],
  },
];
export const getDashboardProfile = (role: string) =>
  dashboardProfiles.find((p) => p.role === role)!;
export const studentCourses: LearningCourse[] = [
  {
    courseId: "math-prep-1",
    completed: 5,
    total: 9,
    nextLesson: "الأعداد النسبية: الفكرة ببساطة",
  },
  {
    courseId: "arabic-prep-1",
    completed: 4,
    total: 9,
    nextLesson: "مدخل إلى القراءة وبناء المعنى",
  },
  {
    courseId: "science-prep-1",
    completed: 3,
    total: 9,
    nextLesson: "مدخل إلى المادة من حولنا",
  },
];
export const weeklyActivity: WeeklyActivity[] = [
  { day: "السبت", minutes: 20 },
  { day: "الأحد", minutes: 35 },
  { day: "الاثنين", minutes: 15 },
  { day: "الثلاثاء", minutes: 30 },
  { day: "الأربعاء", minutes: 25 },
  { day: "الخميس", minutes: 15 },
  { day: "الجمعة", minutes: 0 },
];
export const children: DemoChild[] = [
  {
    id: "youssef",
    name: "يوسف أحمد",
    initials: "ي أ",
    grade: "الصف الأول الإعدادي",
    courses: studentCourses,
    activity: weeklyActivity,
    completed: 12,
    goal: 180,
  },
  {
    id: "salma",
    name: "سلمى أحمد",
    initials: "س أ",
    grade: "الصف الرابع الابتدائي",
    courses: [
      {
        courseId: "math-primary-4",
        completed: 6,
        total: 9,
        nextLesson: "القيمة المكانية: لكل رقم مكان",
      },
    ],
    activity: [
      { day: "السبت", minutes: 15 },
      { day: "الأحد", minutes: 20 },
      { day: "الاثنين", minutes: 0 },
      { day: "الثلاثاء", minutes: 25 },
      { day: "الأربعاء", minutes: 15 },
      { day: "الخميس", minutes: 15 },
      { day: "الجمعة", minutes: 0 },
    ],
    completed: 6,
    goal: 120,
  },
];
export const schedule: ScheduleItem[] = [
  {
    id: "session-1",
    day: "الأحد",
    time: "4:30 م",
    title: "فكرة جديدة في الرياضيات",
    subtitle: "أ. أحمد حسن · الصف الأول الإعدادي",
    tone: "mint",
  },
  {
    id: "session-2",
    day: "الثلاثاء",
    time: "6:00 م",
    title: "القراءة وبناء المعنى",
    subtitle: "أ. مريم عادل · الصف الأول الإعدادي",
    tone: "peach",
  },
  {
    id: "session-3",
    day: "الخميس",
    time: "5:00 م",
    title: "مراجعة المادة من حولنا",
    subtitle: "أ. عمر سالم · الصف الأول الإعدادي",
    tone: "blue",
  },
];
export const activityFeed: TimelineItem[] = [
  {
    id: "activity-1",
    title: "خطوة جديدة في الرياضيات",
    detail: "اكتملت معاينة درس الأعداد النسبية",
    time: "آخر نشاط توضيحي",
    tone: "mint",
  },
  {
    id: "activity-2",
    title: "وقت للقراءة",
    detail: "مراجعة أفكار وحدة القراءة وبناء المعنى",
    time: "نشاط سابق",
    tone: "peach",
  },
  {
    id: "activity-3",
    title: "فضول في العلوم",
    detail: "استكشاف مقدمة المادة من حولنا",
    time: "نشاط سابق",
    tone: "blue",
  },
];
export const teacherReviews: ReviewItem[] = [
  {
    id: "work-1",
    title: "تطبيقات على الأعداد النسبية",
    owner: "يوسف أحمد",
    category: "الأول الإعدادي",
    status: "قيد المراجعة",
  },
  {
    id: "work-2",
    title: "مسائل من الحياة اليومية",
    owner: "ملك إبراهيم",
    category: "الأول الإعدادي",
    status: "قيد المراجعة",
  },
  {
    id: "work-3",
    title: "القيمة المكانية",
    owner: "سلمى أحمد",
    category: "الرابع الابتدائي",
    status: "قيد المراجعة",
  },
];
export const contentReviews: ReviewItem[] = [
  {
    id: "content-1",
    title: "تطبيقات على الكسور",
    owner: "أ. أحمد حسن",
    category: "درس جديد",
    status: "قيد المراجعة",
  },
  {
    id: "content-2",
    title: "نصوص من حياتنا",
    owner: "أ. مريم عادل",
    category: "مورد تعليمي",
    status: "قيد المراجعة",
  },
  {
    id: "content-3",
    title: "مدخل إلى القياس",
    owner: "أ. عمر سالم",
    category: "درس جديد",
    status: "تمت المراجعة",
  },
];
export const demoUsers: DemoUser[] = [
  {
    id: "u1",
    name: "يوسف أحمد",
    email: "youssef@example.com",
    role: "طالب",
    status: "نشط",
  },
  {
    id: "u2",
    name: "سلمى أحمد",
    email: "salma@example.com",
    role: "طالب",
    status: "نشط",
  },
  {
    id: "u3",
    name: "ملك إبراهيم",
    email: "malak@example.com",
    role: "طالب",
    status: "بانتظار المراجعة",
  },
  {
    id: "u4",
    name: "أحمد محمود",
    email: "parent@example.com",
    role: "ولي أمر",
    status: "نشط",
  },
  {
    id: "u5",
    name: "أحمد حسن",
    email: "teacher@example.com",
    role: "مدرس",
    status: "نشط",
  },
  {
    id: "u6",
    name: "سارة علي",
    email: "admin@example.com",
    role: "إدارة",
    status: "نشط",
  },
];

export const primarySchedule: ScheduleItem[] = [
  {
    id: "primary-session",
    day: "الاثنين",
    time: "5:00 م",
    title: "أصدقاء الأرقام: القيمة المكانية",
    subtitle: "أ. أحمد حسن · الصف الرابع الابتدائي",
    tone: "mint",
  },
];
export const primaryActivity: TimelineItem[] = [
  {
    id: "primary-1",
    title: "خطوة في القيمة المكانية",
    detail: "استكشاف معنى الآحاد والعشرات والمئات",
    time: "آخر نشاط توضيحي",
    tone: "mint",
  },
  {
    id: "primary-2",
    title: "مراجعة صورة العدد",
    detail: "مثال توضيحي على الصورة التحليلية",
    time: "نشاط سابق",
    tone: "peach",
  },
];
export const adminActivity: TimelineItem[] = [
  {
    id: "admin-1",
    title: "محتوى جديد للمراجعة",
    detail: "نموذج درس: تطبيقات على الكسور",
    time: "آخر تحديث توضيحي",
    tone: "mint",
  },
  {
    id: "admin-2",
    title: "ملف طالب ينتظر المراجعة",
    detail: "طلب افتراضي باسم ملك إبراهيم",
    time: "تحديث سابق",
    tone: "peach",
  },
  {
    id: "admin-3",
    title: "مراجعة نموذج محتوى",
    detail: "تمت مراجعة مدخل إلى القياس — حالة افتراضية",
    time: "تحديث سابق",
    tone: "blue",
  },
];
