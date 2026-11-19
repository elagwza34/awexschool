import type { Metadata } from "next";
import { GroupRequestsWorkspace } from "@/features/enrollments/join-requests";

export const metadata: Metadata = { title: "طلبات انضمام المجموعات" };

export default function Page() {
  return <GroupRequestsWorkspace role="admin" />;
}
