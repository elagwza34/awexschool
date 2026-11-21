import { PortalPreviewProvider } from "@/features/dashboards/preview-context";
import { AssignmentProvider } from "@/features/assignments/context";
import { ContentProvider } from "@/features/content/context";
import { redirect } from "next/navigation";
import { isDemoEnabled } from "@/features/auth/supabase-server";

export default async function PortalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isDemoEnabled())) redirect("/account");
  return (
    <PortalPreviewProvider>
      <AssignmentProvider>
        <ContentProvider>{children}</ContentProvider>
      </AssignmentProvider>
    </PortalPreviewProvider>
  );
}
