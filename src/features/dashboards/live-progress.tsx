import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccount, sessionClient } from "@/features/auth/supabase-server";
import { progressPercentage } from "@/features/catalog/lesson-progress";

type ProgressRole = "student" | "parent" | "teacher";

type ProgressRow = {
  course_id: string;
  course_title: string;
  student_id: string;
  student_name: string;
  completed_lessons: number;
  total_lessons: number;
  last_completed_at: string | null;
};

const activityDate = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Cairo",
});

export async function LiveProgress({ role }: { role: ProgressRole }) {
  const account = await getAccount();
  if (!account?.roles.includes(role)) redirect("/account");
  const client = await sessionClient();
  const result = client ? await client.rpc("read_lesson_progress", { p_portal: role }) : null;
  const rows = (result?.data ?? []) as ProgressRow[];

  return (
    <main id="main-content" className="dashboard-width space-y-4 py-5">
      <h1 className="text-2xl font-bold">التقدّم والنشاط</h1>
      {!result || result.error ? (
        <p role="alert" className="soft-card p-4">تعذّر تحميل تقدّم الدروس حاليًا.</p>
      ) : !rows.length ? (
        <p className="soft-card p-4">لا توجد مقررات نشطة لعرض تقدّم الدروس.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => {
            const percent = progressPercentage(row.completed_lessons, row.total_lessons);
            return (
              <li key={`${row.course_id}:${row.student_id}`} className="soft-card space-y-2 p-4">
                <h2 className="font-bold">
                  <Link href={`/courses/${row.course_id}/lessons`} className="text-primary underline">
                    {row.course_title}
                  </Link>
                </h2>
                {role !== "student" && <p>{row.student_name}</p>}
                <p>{percent === null ? "لا توجد دروس منشورة." : `تم إكمال ${row.completed_lessons} من ${row.total_lessons} دروس (${percent}٪).`}</p>
                {row.last_completed_at && (
                  <p className="text-sm text-muted-foreground">آخر إكمال: {activityDate.format(new Date(row.last_completed_at))}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
