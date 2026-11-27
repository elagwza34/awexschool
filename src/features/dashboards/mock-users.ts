"use client";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: "student" | "teacher" | "parent" | "admin" | "owner";
  status: "active" | "pending" | "disabled";
  avatar?: string;
  phone?: string;
}

export const mockUsers: MockUser[] = [
  { id: "user-1", name: "يوسف أحمد", email: "youssef@school.com", role: "student", status: "active", avatar: "/avatars/youssef.png" },
  { id: "user-2", name: "أ. أحمد حسن", email: "ahmed@school.com", role: "teacher", status: "active", avatar: "/avatars/ahmed.png" },
  { id: "user-3", name: "أ. مريم عادل", email: "mariam@school.com", role: "teacher", status: "active", avatar: "/avatars/mariam.png" },
  { id: "user-4", name: "أ. عمر سالم", email: "omar@school.com", role: "teacher", status: "active", avatar: "/avatars/omar.png" },
  { id: "user-5", name: "سليمة علي", email: "salma@school.com", role: "student", status: "active", avatar: "/avatars/salma.png" },
  { id: "user-6", name: "نور إبراهيم", email: "nour@school.com", role: "student", status: "active", avatar: "/avatars/nour.png" },
  { id: "user-7", name: "أ. فاطمة محمد", email: "fatima@school.com", role: "parent", status: "active", avatar: "/avatars/fatima.png" },
  { id: "user-8", name: "المدير العام", email: "admin@school.com", role: "admin", status: "active", avatar: "/avatars/admin.png" },
];

export function getMockUsers(): MockUser[] {
  return mockUsers;
}

export function getUserById(id: string): MockUser | undefined {
  return mockUsers.find((u) => u.id === id);
}