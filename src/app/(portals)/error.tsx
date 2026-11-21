"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PortalError({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" tabIndex={-1} className="dashboard-width pt-28 pb-8">
      <section className="soft-card space-y-4 p-6" role="alert">
        <h1 className="text-xl font-bold">تعذّر تحميل اللوحة</h1>
        <p className="text-sm leading-7 text-muted-foreground">جرّب تفتح الصفحة مرة تانية، أو ارجع لقائمة لوحات التحكم.</p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={reset}>حاول مرة تانية</Button>
          <Button asChild variant="outline"><Link href="/dashboards">لوحات التحكم</Link></Button>
        </div>
      </section>
    </main>
  );
}
