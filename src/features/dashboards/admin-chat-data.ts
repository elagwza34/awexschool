import { teachers } from "@/features/catalog/mock-data";
import type { Tone } from "@/features/catalog/types";
import { children, getDashboardProfile } from "./mock-data";
import { previewStudentId, previewTeacherId, type ChatRole } from "./chat-data";

export interface AdminChatThread {
  id: string;
  userId: string;
  role: Exclude<ChatRole, "admin">;
  name: string;
  description: string;
  tone: Tone;
  courseIds: string[];
  courseLabels: string;
}
export const adminChatThreads: AdminChatThread[] = [
  ...teachers.map((teacher) => ({
    id: `admin:teacher:${teacher.id}`,
    userId: teacher.id,
    role: "teacher" as const,
    name: `أ. ${teacher.name}`,
    description: "مدرس",
    tone: teacher.tone,
    courseIds: [],
    courseLabels: "",
  })),
  ...children.map((child) => ({
    id: `admin:student:${child.id}`,
    userId: child.id,
    role: "student" as const,
    name: child.name,
    description: "طالب",
    tone: "blue" as const,
    courseIds: [],
    courseLabels: "",
  })),
  {
    id: "admin:parent:preview-parent",
    userId: "preview-parent",
    role: "parent",
    name: getDashboardProfile("parent").name,
    description: "ولي أمر",
    tone: "peach",
    courseIds: [],
    courseLabels: "",
  },
];

export function adminThreadsForRole(role: ChatRole) {
  if (role === "admin") return adminChatThreads;
  const userId =
    role === "student"
      ? previewStudentId
      : role === "teacher"
        ? previewTeacherId
        : "preview-parent";
  return adminChatThreads.filter(
    (thread) => thread.role === role && thread.userId === userId,
  );
}
