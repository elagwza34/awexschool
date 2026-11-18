"use client";
import { tones } from "@/components/shared";
import { cn } from "@/lib/utils";
import type { DemoChild } from "./types";
export function ParentChildPicker({
  wards,
  selectedId,
  onSelect,
}: {
  wards: DemoChild[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="soft-card flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <h2 className="text-sm font-semibold">رحلة مين هنطمن عليها؟</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          أبناء افتراضيون لمعاينة شكل المتابعة.
        </p>
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="اختيار الابن"
      >
        {wards.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={selectedId === item.id}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl border px-4 py-2 text-xs font-bold",
              selectedId === item.id
                ? "border-primary bg-secondary text-primary"
                : "bg-white hover:bg-muted",
            )}
            onClick={() => onSelect(item.id)}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-[10px]",
                tones[item.id === "youssef" ? "mint" : "peach"],
              )}
            >
              {item.initials}
            </span>
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}
