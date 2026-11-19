import type { Metadata } from "next";
import { AssignmentsWorkspace } from '@/features/assignments/workspace';
export const metadata: Metadata = { title: "الواجبات والتكليفات — لوحة الطالب" };
export default function Page() { return <AssignmentsWorkspace role="student" />; }
