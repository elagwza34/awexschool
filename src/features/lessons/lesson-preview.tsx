"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LessonStep } from "@/features/catalog/types";
import { EmptyState } from "@/components/shared";

export function LessonPreview({
  title,
  steps,
}: {
  title: string;
  steps: LessonStep[];
}) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  if (!current)
    return (
      <EmptyState
        title="المعاينة غير متاحة حاليًا"
        description="جرّب مقررًا آخر من البيانات النموذجية."
      />
    );
  return (
    <section
      className="soft-card overflow-hidden"
      aria-label="معاينة الدرس النصية"
    >
      <div className="flex items-center justify-between gap-3 border-b bg-secondary/40 px-4 py-3">
        <span className="flex items-center gap-2 text-xs font-bold">
          <BookOpen aria-hidden="true" className="size-4" />
          معاينة نصية تفاعلية
        </span>
        <span className="text-xs text-muted-foreground">
          {step + 1} من {steps.length}
        </span>
      </div>
      <div className="lesson-paper flex min-h-70 flex-col items-center justify-center p-4 text-center md:min-h-80">
        <span className="mb-4 rounded-full border bg-white px-4 py-1 text-xs font-bold">
          {title}
        </span>
        <p
          dir={current.direction ?? "rtl"}
          className="font-serif text-2xl font-bold leading-relaxed text-primary sm:text-4xl"
        >
          {current.example}
        </p>
        <div aria-hidden="true" className="mt-6 flex gap-2">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full ${step === i ? "w-8 bg-primary" : "w-3 bg-[#b6c7b4]"}`}
            />
          ))}
        </div>
      </div>
      <div className="p-4">
        <div aria-live="polite" aria-atomic="true">
          <h2 className="text-xl font-semibold">{current.title}</h2>
          <p className="mt-3 min-h-24 leading-7 text-muted-foreground">
            {current.text}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <Button
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          >
            <ArrowRight aria-hidden="true" />
            السابق
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>
              الفكرة التالية
              <ArrowLeft aria-hidden="true" />
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setStep(0)}>
              <RotateCcw aria-hidden="true" />
              أعد المعاينة
            </Button>
          )}
        </div>
        {step === steps.length - 1 && (
          <p
            role="status"
            className="mt-4 flex items-center gap-2 text-sm font-bold text-primary"
          >
            <Check aria-hidden="true" className="size-4" />
            انتهت المعاينة. لا يتم تسجيل تقدم دراسي فعلي.
          </p>
        )}
      </div>
    </section>
  );
}
