import type { Tone } from "@/features/catalog/types";

export type StaffRole = "manager" | "support";
export type DashboardRole =
  | "student"
  | "teacher"
  | "parent"
  | "admin"
  | "owner"
  | StaffRole;
export type MetricIcon =
  | "courses"
  | "students"
  | "time"
  | "complete"
  | "review"
  | "teachers";
export interface DashboardMetric {
  label: string;
  value: string;
  note: string;
  icon: MetricIcon;
  tone: Tone;
}
export interface DashboardProfile {
  role: DashboardRole;
  label: string;
  name: string;
  initials: string;
  subtitle: string;
  greeting: string;
  description: string;
  tone: Tone;
  metrics: DashboardMetric[];
}
export interface LearningCourse {
  courseId: string;
  completed: number;
  total: number;
  nextLesson: string;
}
export interface WeeklyActivity {
  day: string;
  minutes: number;
}
export interface ScheduleItem {
  id: string;
  day: string;
  time: string;
  title: string;
  subtitle: string;
  tone: Tone;
}
export interface TimelineItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  tone: Tone;
}
export interface DemoChild {
  id: string;
  name: string;
  initials: string;
  grade: string;
  courses: LearningCourse[];
  activity: WeeklyActivity[];
  completed: number;
  goal: number;
}
export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "نشط" | "بانتظار المراجعة" | "معطل";
}
export interface ReviewItem {
  id: string;
  title: string;
  owner: string;
  category: string;
  status: "قيد المراجعة" | "تمت المراجعة";
}
