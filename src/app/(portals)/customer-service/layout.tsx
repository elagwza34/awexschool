import { PortalBoundary } from "@/components/layout/portal-boundary";
export default function StaffLayout({children}:{children:React.ReactNode}){return <PortalBoundary role="customer-service">{children}</PortalBoundary>;}
