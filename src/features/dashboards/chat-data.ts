import { getCourse } from "@/features/catalog/mock-data";
import { children } from "./mock-data";

export type ChatRole = "student" | "teacher" | "parent" | "admin";
export interface ChatThread {
  id: string;
  studentId: string;
  teacherId: string;
  courseIds: string[];
}
export interface ChatMessage {
  id: string;
  threadId: string;
  sender: ChatRole;
  text: string;
  attachment?: File;
  senderName?: string;
  sentAt: string;
}
export const previewStudentId = "youssef";
export const previewTeacherId = "ahmed-hassan";

// Membership comes from fixed enrollment/teaching fixtures, never editable profile fields.
export const chatThreads: ChatThread[] = children.flatMap((student) => {
  const teachers = new Map<string, string[]>();
  for (const entry of student.courses) {
    const course = getCourse(entry.courseId)!;
    teachers.set(course.teacherId, [
      ...(teachers.get(course.teacherId) ?? []),
      course.id,
    ]);
  }
  return [...teachers].map(([teacherId, courseIds]) => ({
    id: `${student.id}:${teacherId}`,
    studentId: student.id,
    teacherId,
    courseIds,
  }));
});

export function threadsForRole(role: ChatRole) {
  if (role !== "student" && role !== "teacher") return [];
  return chatThreads.filter((thread) =>
    role === "student"
      ? thread.studentId === previewStudentId
      : thread.teacherId === previewTeacherId,
  );
}

export const chatMessageFixtures: ChatMessage[] = [
  {
    id: "chat-1",
    threadId: "youssef:ahmed-hassan",
    sender: "student",
    text: "مساء الخير يا أستاذ، ممكن توضح لي الفرق بين العدد النسبي والعدد الصحيح؟",
    sentAt: "2026-11-15T12:00:00Z",
  },
  {
    id: "chat-2",
    threadId: "youssef:ahmed-hassan",
    sender: "teacher",
    text: "أكيد يا يوسف. كل عدد صحيح نقدر نكتبه على صورة كسر مقامه ١، لكن مش كل عدد نسبي عددًا صحيحًا. مثال: ١/٢ عدد نسبي، لكنه مش صحيح.",
    sentAt: "2026-11-15T12:05:00Z",
  },
  {
    id: "chat-3",
    threadId: "youssef:mariam-adel",
    sender: "teacher",
    text: "أهلًا يا يوسف. لو عندك سؤال في القراءة أو التعبير، اكتبه هنا واذكر اسم الدرس.",
    sentAt: "2026-11-15T11:00:00Z",
  },
  {
    id: "chat-4",
    threadId: "salma:ahmed-hassan",
    sender: "student",
    text: "ممكن مثال كمان على القيمة المكانية؟",
    sentAt: "2026-11-15T10:00:00Z",
  },
];
