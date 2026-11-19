import type { Metadata } from "next";
import { RequestForm } from "@/features/dashboards/request-form";

export const metadata: Metadata = { title: "قدّم شكوى أو طلب" };

export default function ContactPage() {
  return <div className="container-shell py-8"><RequestForm source="visitor" /></div>;
}
