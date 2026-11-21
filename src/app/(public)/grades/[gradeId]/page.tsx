import Link from "next/link";
import { notFound } from "next/navigation";
import { grades } from "@/features/catalog/mock-data";
import { PageIntro } from "@/components/shared";
import { Button } from "@/components/ui/button";

export default async function GradePage({ params }: { params: Promise<{ gradeId: string }> }) {
  const { gradeId } = await params;
  const grade = grades.find((item) => item.id === gradeId);
  if (!grade) notFound();
  return <div className="container-shell py-8">
    <PageIntro title={grade.name} description="????? ?????? ???? ???????? ???????? ????." />
    <div className="flex flex-wrap gap-3">
      <Button asChild><Link href={`/courses?grade=${grade.id}&track=arabic`}>???? ????</Link></Button>
      <Button asChild variant="outline"><Link href={`/courses?grade=${grade.id}&track=languages`}>???? ????</Link></Button>
    </div>
  </div>;
}
