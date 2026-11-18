import { PortalBoundary } from "@/components/layout/portal-boundary";
export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalBoundary role="teacher">{children}</PortalBoundary>;
}
