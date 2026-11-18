"use client";

import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DemoDialog({
  label,
  title = "أنت في نسخة العرض التجريبي",
  description = "هذه معاينة للواجهة فقط. الاشتراكات والمدفوعات غير مفعلة، ولم يتم إنشاء حساب أو تنفيذ أي عملية.",
  className,
}: {
  label: string;
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className={className}>{label}</Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader className="text-start">
          <span className="mb-3 flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
            <Info aria-hidden="true" />
          </span>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="pt-2 leading-7">
            {description}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
