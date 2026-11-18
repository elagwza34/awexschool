import type { SubjectId, StageId } from "@/features/catalog/types";
import type { DashboardRole } from "./types";

export type MeetingProvider = "google-meet" | "zoom";
export interface TeacherProfileDraft {
  fullName: string;
  displayName: string;
  email: string;
  phone: string;
  governorate: string;
  qualification: string;
  experienceYears: number;
  bio: string;
  teachingApproach: string;
  specialization: SubjectId;
  specialtyDetail: string;
  curriculumId: string;
  academicYear: string;
  term: string;
  stageIds: StageId[];
  gradeIds: string[];
}
export interface ProviderPreviewSettings {
  provider: MeetingProvider;
  hostName: string;
  hostEmail: string;
  calendarId: string;
  timezone: "Africa/Cairo";
  defaultDuration: number;
  autoCreate: boolean;
  demoEnabled: boolean;
}
export interface SessionDraft {
  groupId?: string;
  title: string;
  courseId: string;
  date: string;
  time: string;
  duration: number;
  provider: MeetingProvider;
  description: string;
}
export interface SessionPreview extends SessionDraft {
  groupId: string;
  groupName: string;
  teacherId: string;
  teacherName: string;
  studentIds: string[];
  status: "scheduled" | "cancelled";
  cancellationReason?: string;
  id: string;
  timezone: "Africa/Cairo";
  hostName: string;
  hostEmail: string;
  meetingStatus: "simulated" | "awaiting_connection" | "disabled";
  meetingReference?: string;
}
export type AttendanceStatus = "present" | "absent" | "late";
export type AttendanceInput = AttendanceStatus | "unmarked";
export type AttendanceRegister = Record<
  string,
  Record<string, AttendanceStatus>
>;
export interface RolePreviewDefinition {
  id: DashboardRole;
  label: string;
  description: string;
  userRole: string;
  capabilities: string[];
}
