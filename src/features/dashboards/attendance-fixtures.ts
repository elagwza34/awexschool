export const attendancePreviewSessions = [
  { id: "session-1", title: "حصة رياضيات - الجبر", group_id: "group-1", starts_at: "2026-11-25T09:00:00Z", teacher_id: "user-2", status: "scheduled" },
  { id: "session-2", title: "حصة علوم - الفيزياء", group_id: "group-2", starts_at: "2026-11-26T11:00:00Z", teacher_id: "user-3", status: "scheduled" },
];

export const attendancePreviewMembers = [
  { student_id: "user-1", profiles: { display_name: "يوسف أحمد" } },
  { student_id: "user-5", profiles: { display_name: "سليمة علي" } },
  { student_id: "user-6", profiles: { display_name: "نور إبراهيم" } },
];

export const attendancePreviewRecords = [
  { session_id: "session-1", student_id: "user-1", status: "present" },
  { session_id: "session-1", student_id: "user-5", status: "absent" },
  { session_id: "session-1", student_id: "user-6", status: "late" },
];
