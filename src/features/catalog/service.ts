import { createClient } from "@/lib/supabase";
import type { Course, Grade, Stage, Subject, Teacher } from "./types";

export const normalizeArabic = (value: string) =>
  value
    .toLocaleLowerCase("ar-EG")
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670ـ]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .trim();

const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

export function filterCourses({
  query = "",
  grade,
  subject,
  track,
}: {
  query?: string;
  grade?: string;
  subject?: string;
  track?: "arabic" | "languages";
}) {
  const needle = query.toLocaleLowerCase("ar-EG");
  return (courses: Course[]) =>
    courses.filter(
      (course) =>
        (!grade || course.gradeId === grade) &&
        (!subject || course.subjectId === subject) &&
        (!track || course.track === track) &&
        course.title.toLocaleLowerCase("ar-EG").includes(needle)
    );
}

export const catalogService = {
  async listStages(): Promise<Stage[]> {
    if (!hasSupabase) {
      const { stages } = await import("./mock-data");
      return stages;
    }
    const supabase = createClient();
    const { data, error } = await supabase
      .from("stages")
      .select("*")
      .order("position", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Stage[];
  },

  async listGrades(stageId?: string): Promise<Grade[]> {
    if (!hasSupabase) {
      const { grades } = await import("./mock-data");
      return stageId ? grades.filter((g) => g.stageId === stageId) : grades;
    }
    const supabase = createClient();
    let query = supabase
      .from("grades")
      .select("*")
      .order("position", { ascending: true });
    if (stageId) query = query.eq("stage_id", stageId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Grade[];
  },

  async listSubjects(): Promise<Subject[]> {
    if (!hasSupabase) {
      const { subjects } = await import("./mock-data");
      return subjects;
    }
    const supabase = createClient();
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Subject[];
  },

  async listTeachers(subjectId?: string): Promise<Teacher[]> {
    if (!hasSupabase) {
      const { teachers } = await import("./mock-data");
      return subjectId
        ? teachers.filter((t) => t.subjectId === subjectId)
        : teachers;
    }
    const supabase = createClient();
    let q = supabase.from("teacher_profiles").select(
      `user_id, subject_id, full_name, qualification, experience_years, bio`
    );
    if (subjectId) q = q.eq("subject_id", subjectId);
    const { data, error } = await q;
    if (error) throw error;
    return (
      data?.map((row) => {
        const r = row as Record<string, unknown>;
        const fullName = String(r.full_name ?? "");
        return {
          id: String(r.user_id ?? ""),
          name: fullName || "مدرس",
          initials: fullName
            ? fullName
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .slice(0, 2)
            : "م",
          subjectId: String(r.subject_id ?? "") as Teacher["subjectId"],
          title: "مدرس",
          experience: Number(r.experience_years ?? 0),
          bio: String(r.bio ?? ""),
          tone: "mint" as const,
        };
      }) ?? []
    );
  },

  async listCourses({
    query = "",
    grade,
    subject,
    track,
  }: {
    query?: string;
    grade?: string;
    subject?: string;
    track?: "arabic" | "languages";
  } = {}): Promise<Course[]> {
    if (!hasSupabase) {
      const { courses } = await import("./mock-data");
      return filterCourses({ query, grade, subject, track })(courses);
    }
    const supabase = createClient();
    let q = supabase
      .from("courses")
      .select(
        `id, slug, grade_id, subject_id, track, title, description, status, created_at`
      )
      .eq("status", "published");
    if (grade) q = q.eq("grade_id", grade);
    if (subject) q = q.eq("subject_id", subject);
    if (track) q = q.eq("track", track);
    if (query) {
      q = q.ilike("title", `%${query}%`);
    }
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) throw error;
    return (
      (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        gradeId: row.grade_id,
        subjectId: row.subject_id,
        track: row.track,
        teacherId: "",
        term: "",
        price: 0,
        units: [],
      })) as Course[]
    );
  },

  async getCourse(id: string): Promise<Course | undefined> {
    if (!hasSupabase) {
      const { getCourse } = await import("./mock-data");
      return getCourse(id);
    }
    const supabase = createClient();
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return undefined;
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      gradeId: data.grade_id,
      subjectId: data.subject_id,
      track: data.track,
      teacherId: "",
      term: "",
      price: 0,
      units: [],
    } as Course;
  },
};