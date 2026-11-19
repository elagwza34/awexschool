import { PortalCourseReader } from "@/features/content/reader";
export const metadata = { title: "المحتوى التعليمي" };

export default async function Page({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<{ student?: string; lesson?: string }> }) {
 const { courseId } = await params; const query = await searchParams;
 return <PortalCourseReader role="admin" courseId={courseId} studentId={typeof query.student === "string" ? query.student : undefined} lessonId={typeof query.lesson === "string" ? query.lesson : undefined} />;
}
