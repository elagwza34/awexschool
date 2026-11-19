import { PortalPreviewProvider } from "@/features/dashboards/preview-context";
import { StaffPreviewProvider } from "@/features/dashboards/staff-context";
import { EnrollmentPreviewProvider } from "@/features/enrollments/context";
import { AssignmentProvider } from "@/features/assignments/context";
import { ContentProvider } from "@/features/content/context";
import { PermissionPreviewProvider } from "@/features/dashboards/permissions-context";

export default function PortalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EnrollmentPreviewProvider>
      <PortalPreviewProvider>
        <AssignmentProvider>
          <PermissionPreviewProvider>
            <ContentProvider>
              <StaffPreviewProvider>{children}</StaffPreviewProvider>
            </ContentProvider>
          </PermissionPreviewProvider>
        </AssignmentProvider>
      </PortalPreviewProvider>
    </EnrollmentPreviewProvider>
  );
}
