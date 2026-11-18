import { PortalBoundary } from "@/components/layout/portal-boundary";
import { ParentSelectionProvider } from "@/features/dashboards/interactive-workspaces";
export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalBoundary role="parent">
      <ParentSelectionProvider>{children}</ParentSelectionProvider>
    </PortalBoundary>
  );
}
