import type { Metadata } from "next";
import { ManagementHeader } from "@/features/dashboards/management-header";
import { IntegrationSettings } from "@/features/dashboards/integration-settings";

export const metadata: Metadata = { title: "ربط Google Meet وZoom — محاكاة" };
export default function AdminIntegrationsPage() {
  return (
    <>
      <ManagementHeader
        role="admin"
        title="ربط Google Meet وZoom"
        description="تفاصيل حساب الاستضافة والتقويم والتوقيت والإنشاء التلقائي، مع محاكاة لرحلة الربط وإنشاء اجتماع الحصة من لوحة المدرس."
      />
      <IntegrationSettings />
    </>
  );
}
