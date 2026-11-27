"use client";

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