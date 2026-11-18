"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import { grades, stages } from "@/features/catalog/mock-data";
import { Button } from "@/components/ui/button";

export function GradeFinder() {
  const [stage, setStage] = useState("preparatory");
  const [grade, setGrade] = useState("preparatory-1");
  const router = useRouter();
  return (
    <form
      className="soft-card relative z-10 grid items-end gap-3 p-4 shadow-none md:grid-cols-[1.2fr_1fr_1fr_auto] md:p-4"
      onSubmit={(event) => {
        event.preventDefault();
        router.push(`/grades/${grade}`);
      }}
    >
      <div className="flex items-center gap-3 self-center">
        <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
          <SlidersHorizontal aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold">هنبدأ منين النهارده؟</h2>
          <p className="text-xs text-muted-foreground">
            اختار صفك، وخلي الباقي علينا.
          </p>
        </div>
      </div>
      <div>
        <label
          htmlFor="finder-stage"
          className="mb-1 block text-xs font-semibold"
        >
          المرحلة الدراسية
        </label>
        <select
          id="finder-stage"
          className="field"
          value={stage}
          onChange={(event) => {
            setStage(event.target.value);
            setGrade(`${event.target.value}-1`);
          }}
        >
          {stages.map((s) => (
            <option value={s.id} key={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="finder-grade"
          className="mb-1 block text-xs font-semibold"
        >
          الصف الدراسي
        </label>
        <select
          id="finder-grade"
          className="field"
          value={grade}
          onChange={(event) => setGrade(event.target.value)}
        >
          {grades
            .filter((g) => g.stageId === stage)
            .map((g) => (
              <option value={g.id} key={g.id}>
                {g.name}
              </option>
            ))}
        </select>
      </div>
      <Button type="submit" className="min-h-11">
        اكتشف مقرراتك
        <ArrowLeft aria-hidden="true" />
      </Button>
    </form>
  );
}
