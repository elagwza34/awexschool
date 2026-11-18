import { notFound } from "next/navigation";
import { DashboardView } from "@/features/dashboards/dashboard-view";
import { studentFixtures as children } from "@/features/enrollments/data";

export const dynamicParams = false;
export function generateStaticParams() {
  return children.map((child) => ({ childId: child.id }));
}

export default async function ParentChildCoursesPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  if (!children.some((child) => child.id === childId)) notFound();
  return <DashboardView role="parent" section="courses" childId={childId} />;
}
