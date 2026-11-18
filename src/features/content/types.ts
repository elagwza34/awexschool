import type { SubjectId } from "@/features/catalog/types";
export interface ContentResource {
  id: string;
  title: string;
  kind: "pdf" | "video" | "link";
  reference: string;
}
export interface ContentLesson {
  id: string;
  title: string;
  minutes: number;
  body: string;
  objectives: string[];
  resources: ContentResource[];
}
export interface ContentUnit {
  id: string;
  title: string;
  lessons: ContentLesson[];
}
export interface ContentCourse {
  id: string;
  title: string;
  description: string;
  gradeId: string;
  subjectId: SubjectId;
  teacherId: string;
  term: string;
  units: ContentUnit[];
}
export type ContentStatus = "draft" | "review" | "changes" | "published";
export interface ContentRecord {
  working: ContentCourse;
  published?: ContentCourse;
  retired?: ContentCourse;
  revision: number;
  publishedRevision?: number;
  status: ContentStatus;
  reviewNote: string;
}
export type ContentRole = "teacher" | "admin";
export type ContentResult = { ok: true } | { ok: false; error: string };
