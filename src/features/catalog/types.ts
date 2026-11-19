export type StageId = "kindergarten" | "primary" | "preparatory" | "secondary";
export type SubjectId =
  | "math"
  | "arabic"
  | "science"
  | "english"
  | "physics"
  | "history";
export type Tone = "mint" | "peach" | "blue" | "lilac";

export interface Stage {
  id: StageId;
  name: string;
  description: string;
  tone: Tone;
}
export interface Grade {
  id: string;
  name: string;
  stageId: StageId;
}
export interface Subject {
  id: SubjectId;
  name: string;
  description: string;
  symbol: string;
  tone: Tone;
}
export interface Teacher {
  id: string;
  name: string;
  initials: string;
  // Exactly one subject per teacher; multiple teachers may share this value.
  subjectId: SubjectId;
  title: string;
  bio: string;
  experience: number;
  tone: Tone;
}
export interface LessonStep {
  title: string;
  text: string;
  example: string;
  direction?: "rtl" | "ltr";
}
export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  preview: boolean;
  summary: string;
  objectives: string[];
  previewSteps?: LessonStep[];
}
export interface Unit {
  id: string;
  title: string;
  lessons: Lesson[];
}
export const courseTrackLabels = { arabic: "عربي", languages: "لغات" } as const;
export type CourseTrack = keyof typeof courseTrackLabels;

export interface Course {
  id: string;
  title: string;
  description: string;
  gradeId: string;
  track?: CourseTrack;
  subjectId: SubjectId;
  teacherId: string;
  term: string;
  price: number;
  units: Unit[];
}
export interface CatalogQuery {
  query?: string;
  grade?: string;
  subject?: string;
  track?: CourseTrack;
}
export interface CatalogService {
  listCourses(query?: CatalogQuery): Promise<Course[]>;
  getCourse(id: string): Promise<Course | undefined>;
}
