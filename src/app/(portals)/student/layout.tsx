import { PortalBoundary } from "@/components/layout/portal-boundary";
export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalBoundary role="student">{children}</PortalBoundary>;
}
