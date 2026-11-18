export interface Assignment {
  id: string;
  title: string;
  instructions: string;
  groupId: string;
  groupName: string;
  courseId: string;
  teacherId: string;
  teacherName: string;
  studentIds: string[];
  sessionId?: string;
  sessionTitle?: string;
  dueDate: string;
  maxScore: number;
}
export interface Submission {
  assignmentId: string;
  studentId: string;
  answer: string;
  submittedAt: string;
  score?: number;
  feedback?: string;
}
export type AssignmentDraft = Pick<
  Assignment,
  "title" | "instructions" | "groupId" | "dueDate" | "maxScore" | "sessionId"
>;
export type Result = { ok: true } | { ok: false; error: string };
