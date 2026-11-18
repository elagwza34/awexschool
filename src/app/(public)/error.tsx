"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container-shell py-12 text-center" role="alert">
      <AlertCircle
        aria-hidden="true"
        className="mx-auto mb-4 size-12 text-destructive"
      />
      <h1 className="text-2xl font-semibold">تعذّر عرض المحتوى</h1>
      <p className="my-4 text-muted-foreground">
        حصل خطأ أثناء تحميل الصفحة. جرّب مرة تانية أو ارجع للرئيسية.
      </p>
      <div className="flex justify-center gap-3">
        <Button onClick={reset}>حاول مرة أخرى</Button>
        <Button asChild variant="outline">
          <Link href="/">الرئيسية</Link>
        </Button>
      </div>
    </div>
  );
}
