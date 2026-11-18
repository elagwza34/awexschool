import { PortalBoundary } from "@/components/layout/portal-boundary";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalBoundary role="admin">{children}</PortalBoundary>;
}
