import Link from "next/link";
import { ownerClient } from "@/features/auth/supabase-server";

export const metadata = { title: "متابعة طلب تقديم مدرس" };
const statuses: Record<string, string> = { pending: "قيد المراجعة", accepted: "تم قبول الطلب", rejected: "لم يُقبل الطلب" };

export default async function TeacherTrackingPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference } = await searchParams;
  const client = ownerClient();
  const result = reference && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(reference) && client
    ? await client.from("teacher_applications").select("status").eq("id", reference).maybeSingle() : null;
  return <div className="container-shell max-w-xl py-10">
    <h1 className="text-2xl font-bold">متابعة طلب تقديم مدرس</h1>
    <form className="soft-card mt-5 grid gap-4 p-5">
      <label className="grid gap-2 text-sm font-semibold">رقم المتابعة
        <input className="field" name="reference" dir="ltr" defaultValue={reference} maxLength={36} required />
      </label>
      <button className="min-h-11 rounded-lg bg-primary px-4 text-primary-foreground">عرض حالة الطلب</button>
      {reference && <p role="status" className="text-sm">{result?.data ? statuses[result.data.status] : "الطلب غير موجود أو رقم المتابعة غير صحيح."}</p>}
    </form>
    <Link href="/teachers/apply" className="mt-4 inline-flex min-h-11 items-center text-primary underline">انضم كمدرس</Link>
  </div>;
}
