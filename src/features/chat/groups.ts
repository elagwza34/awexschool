import { previewStudentId, previewTeacherId } from "@/features/dashboards/chat-data";
import { isStaffRole } from "@/features/dashboards/staff-data";
import type { DashboardRole } from "@/features/dashboards/types";
import type { LearningGroup } from "@/features/enrollments/data";

export const groupChatPermission = "page:group-chat";
export const canMonitorGroupChat = (role: DashboardRole) => role === "admin" || isStaffRole(role);
export const supportsGroupChat = (role: DashboardRole) =>
  role === "student" || role === "teacher" || canMonitorGroupChat(role);
export const groupChatHref = (role: DashboardRole, groupId?: string) =>
  `/workspace/${role}/group-chat${groupId ? `?group=${encodeURIComponent(groupId)}` : ""}`;

export function isGroupChatMember(
  role: DashboardRole,
  group: LearningGroup,
  assignments: Record<string, string>,
) {
  return group.active && (role === "student"
    ? group.studentIds.includes(previewStudentId)
    : role === "teacher" && assignments[group.courseId] === previewTeacherId);
}
