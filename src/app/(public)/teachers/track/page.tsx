import Link from "next/link";
import { FormMessage } from "@/features/auth/auth-card";
import { LiveTrackingForm } from "@/features/teachers/live-tracking-form";
import { readTeacherCaptchaPublicConfig } from "@/features/teachers/teacher-intake-security";

export const metadata = { title: "متابعة طلب تقديم مدرس" };

export default async function TeacherTrackingPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference } = await searchParams;
  const captchaSiteKey = readTeacherCaptchaPublicConfig();
  return <div className="container-shell max-w-xl py-10">
    <h1 className="text-2xl font-bold">متابعة طلب تقديم مدرس</h1>
    {captchaSiteKey
      ? <LiveTrackingForm reference={reference} captchaSiteKey={captchaSiteKey} />
      : <FormMessage error>متابعة الطلبات غير متاحة حاليًا.</FormMessage>}
    <Link href="/teachers/apply" className="mt-4 inline-flex min-h-11 items-center text-primary underline">انضم كمدرس</Link>
  </div>;
}
