import type { Metadata } from "next";
import { ContentWorkspace } from "@/features/content/workspace";

export const metadata: Metadata = { title: "إدارة المناهج" };

export default function CurriculaPage() {
  return <ContentWorkspace role="admin" curriculum />;
}
