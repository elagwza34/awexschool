path = r'd:\Projects-code\liveschool\src\features\dashboards\live-attendance.tsx'
content = '''import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthSubmit } from "@/features/auth/form-controls";
import { getAccount, ownerClient } from "@/features/auth/supabase-server";
import { recordPortalAttendance } from "./live-attendance-actions";

type Role = "teacher" | "student" | "parent";
const statuses = { present: "حاضر", absent: "غائب", late: "متأخر" };
const date = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" });
const labelFor = (status: keyof typeof statuses) => statuses[status] ?? "غير مسجل";

// بيانات تجريبية للحضور (للعمل بدون بايك إند)
const mockAttendanceSessions = [
  { id: "session-1", title: "حصة رياضيات - الجبر", group_id: "group-1", starts_at: "2026-11-25T09:00:00Z", teacher_id: "user-2", status: "scheduled" },
  { id: "session-2", title: "حصة علوم - الفيزياء", group_id: "group-2", starts_at: "2026-11-26T11:00:00Z", teacher_id: "user-3", status: "scheduled" }
];
const mockAttendanceMembers = [
  { student_id: "user-1", profiles: { display_name: "يوسف أحمد" } },
  { student_id: "user-5", profiles: { display_name: "سليمة علي" } },
  { student_id: "user-6", profiles: { display_name: "نور إبراهيم" } }
];
const mockAttendanceRecords = [
  { session_id: "session-1", student_id: "user-1", status: "present" },
  { session_id: "session-1", student_id: "user-5", status: "absent" },
  { session_id: "session-1", student_id: "user-6", status: "late" }
];

export async function LiveAttendance({ role, searchParams }: {
  role: Role; searchParams: Promise<{ session?: string; message?: string }>;
}) {
  const [account, params] = await Promise.all([getAccount(), searchParams]);
  const client = ownerClient();
  if (!client || !account?.roles.includes(role)) redirect("/account");
'''
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Part 1 written')