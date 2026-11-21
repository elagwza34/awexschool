import { redirect } from "next/navigation";

export default async function SubjectPage({ params, searchParams }: {
  params: Promise<{ subjectId: string }>;
  searchParams: Promise<{ grade?: string; track?: string }>;
}) {
  const [{ subjectId }, { grade, track }] = await Promise.all([params, searchParams]);
  const query = new URLSearchParams({ subject: subjectId });
  if (grade) query.set("grade", grade);
  if (track) query.set("track", track);
  redirect(`/courses?${query}`);
}
