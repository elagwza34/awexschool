import { redirect } from "next/navigation";
import { getAccount } from "@/features/auth/supabase-server";

export default async function StudentProfilePage() {
  const account = await getAccount();
  if (!account?.roles.includes("student")) redirect("/account");

  return <main id="main-content" className="container-shell space-y-4 pt-5 pb-10">
    <h1 className="text-2xl font-bold">الملف الشخصي</h1>
    <dl className="soft-card grid gap-5 p-5 sm:grid-cols-2">
      <div className="min-w-0"><dt className="text-sm text-muted-foreground">الاسم</dt><dd className="mt-1 break-words font-semibold">{account.name}</dd></div>
      <div className="min-w-0"><dt className="text-sm text-muted-foreground">البريد الإلكتروني</dt><dd className="mt-1 break-all font-semibold"><bdi>{account.user.email}</bdi></dd></div>
    </dl>
  </main>;
}
