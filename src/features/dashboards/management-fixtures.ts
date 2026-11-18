import type {
  ProviderPreviewSettings,
  RolePreviewDefinition,
  TeacherProfileDraft,
} from "./management-types";

export const teacherProfileFixture: TeacherProfileDraft = {
  fullName: "أحمد محمد حسن",
  displayName: "أ. أحمد حسن",
  email: "ahmed.teacher@example.com",
  phone: "",
  governorate: "الجيزة",
  qualification: "بكالوريوس تربية — قسم الرياضيات",
  experienceYears: 12,
  bio: "مدرس رياضيات يهتم ببناء الفهم والثقة، وشرح الأفكار بخطوات بسيطة تناسب المرحلة الدراسية.",
  teachingApproach:
    "نبدأ بسؤال من الحياة، ثم نمثّل الفكرة بصريًا، ونطبّقها على أمثلة متدرجة مع مساحة للأسئلة.",
  specialization: "math",
  specialtyDetail: "الجبر والهندسة وتأسيس الرياضيات",
  curriculumId: "egypt-ar",
  academicYear: "2026-2027",
  term: "first",
  stageIds: ["primary", "preparatory"],
  gradeIds: ["primary-4", "preparatory-1"],
};
export const curriculumOptions = [
  { id: "egypt-ar", name: "المنهج المصري — عربي" },
  { id: "egypt-languages", name: "المنهج المصري — لغات" },
];
export const providerFixtures: Record<
  "google-meet" | "zoom",
  ProviderPreviewSettings
> = {
  "google-meet": {
    provider: "google-meet",
    hostName: "حساب استضافة liveschool التجريبي",
    hostEmail: "meet-host@example.com",
    calendarId: "primary",
    timezone: "Africa/Cairo",
    defaultDuration: 45,
    autoCreate: true,
    demoEnabled: false,
  },
  zoom: {
    provider: "zoom",
    hostName: "مضيف Zoom التجريبي",
    hostEmail: "zoom-host@example.com",
    calendarId: "",
    timezone: "Africa/Cairo",
    defaultDuration: 45,
    autoCreate: true,
    demoEnabled: false,
  },
};
export const providerNames = {
  "google-meet": "Google Meet",
  zoom: "Zoom",
} as const;
export const roleDefinitions: RolePreviewDefinition[] = [
  {
    id: "student",
    label: "الطالب",
    userRole: "طالب",
    description: "رحلة التعلّم والمقررات المتاحة للطالب.",
    capabilities: [
      "استعراض المقررات المسموح بها",
      "عرض الدروس والتقدّم الشخصي",
      "عرض مواعيد الحصص المخصصة له",
    ],
  },
  {
    id: "teacher",
    label: "المدرس",
    userRole: "مدرس",
    description: "الملف المهني والمقررات المسندة والحصص.",
    capabilities: [
      "تحديث الملف المهني والتخصص",
      "معاينة محتوى المقررات المسندة",
      "تجهيز حصة على مقرر مسند",
      "عرض أعمال الطلاب ضمن نطاقه",
    ],
  },
  {
    id: "parent",
    label: "ولي الأمر",
    userRole: "ولي أمر",
    description: "متابعة الأبناء المرتبطين بالحساب فقط.",
    capabilities: [
      "عرض تقدّم الأبناء المرتبطين",
      "عرض مقررات ومواعيد الأبناء",
      "متابعة النتائج المسموح بنشرها",
    ],
  },
  {
    id: "admin",
    label: "الإدارة",
    userRole: "إدارة",
    description: "فصل إدارة المستخدمين والمحتوى وخدمات الحصص.",
    capabilities: [
      "مراجعة المستخدمين وتعريفات الأدوار",
      "مراجعة المحتوى في قسم مستقل",
      "إعداد خدمات الاجتماعات ضمن الصلاحية المعتمدة",
      "عرض تقارير نطاق الإدارة",
    ],
  },
];
export const connectionSteps = {
  "google-meet": [
    "اختيار حساب Google المستضيف",
    "تحديد التقويم المخصص للحصص",
    "الموافقة على صلاحيات التطبيق",
    "تجربة إنشاء حصة وربط اجتماعها",
  ],
  zoom: [
    "اختيار حساب Zoom المستضيف",
    "اعتماد التطبيق وطريقة التفويض",
    "تحديد صلاحيات جدولة الاجتماعات",
    "تجربة حصة وعرض بيانات الانضمام",
  ],
};
