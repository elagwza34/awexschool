import { PortalPreviewProvider } from "@/features/dashboards/preview-context";
import { AssignmentProvider } from "@/features/assignments/context";
import { ContentProvider } from "@/features/content/context";

export default function PortalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalPreviewProvider>
      <AssignmentProvider>
        <ContentProvider>{children}</ContentProvider>
      </AssignmentProvider>
    </PortalPreviewProvider>
  );
}
