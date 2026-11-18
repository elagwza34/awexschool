import { PortalPreviewProvider } from "@/features/dashboards/preview-context";
import { StaffPreviewProvider } from "@/features/dashboards/staff-context";
import { EnrollmentPreviewProvider } from "@/features/enrollments/context";
import { AssignmentProvider } from "@/features/assignments/context";
import { ContentProvider } from "@/features/content/context";

export default function PortalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EnrollmentPreviewProvider>
      <PortalPreviewProvider>
        <AssignmentProvider>
          <ContentProvider>
            <StaffPreviewProvider>{children}</StaffPreviewProvider>
          </ContentProvider>
        </AssignmentProvider>
      </PortalPreviewProvider>
    </EnrollmentPreviewProvider>
  );
}
