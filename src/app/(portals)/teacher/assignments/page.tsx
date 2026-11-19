import type { Metadata } from "next";
import { AssignmentsWorkspace } from '@/features/assignments/workspace';
export const metadata: Metadata = { title: "الواجبات والتكليفات — لوحة المدرس" };
export default function Page() { return <AssignmentsWorkspace role="teacher" />; }
