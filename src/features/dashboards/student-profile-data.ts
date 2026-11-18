import type { StageId } from "@/features/catalog/types";

export interface StudentProfileDraft {
  fullName: string;
  displayName: string;
  email: string;
  phone: string;
  governorate: string;
  schoolName: string;
  stageId: StageId;
  gradeId: string;
  curriculumId: string;
  academicYear: string;
  about: string;
}

export const studentProfileFixture: StudentProfileDraft = {
  fullName: "يوسف أحمد محمود",
  displayName: "يوسف أحمد",
  email: "youssef@example.com",
  phone: "",
  governorate: "الجيزة",
  schoolName: "مدرسة النموذج التجريبية",
  stageId: "preparatory",
  gradeId: "preparatory-1",
  curriculumId: "egypt-ar",
  academicYear: "2026-2027",
  about: "بحب أفهم الفكرة من مثال، وأجرّب بنفسي، وأسأل لما حاجة تكون مش واضحة.",
};

export const studentGuardianFixture = { displayName: "أحمد محمود" } as const;
