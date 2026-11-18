"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TeacherCard } from "@/components/catalog-cards";
import { Button } from "@/components/ui/button";
import type { Teacher } from "@/features/catalog/types";
import { cn } from "@/lib/utils";

export function TeachersCarousel({ teachers }: { teachers: Teacher[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const canLoop = teachers.length > 1;
  const items = canLoop ? [...teachers, ...teachers] : teachers;

  const getStep = () => {
    const el = ref.current;
    if (!el) return 280;
    const first = el.children[0] as HTMLElement | undefined;
    const second = el.children[1] as HTMLElement | undefined;
    if (first && second) return second.offsetLeft - first.offsetLeft;
    if (first) return first.offsetWidth + 16;
    return 280;
  };

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const step = getStep();
    const setWidth = el.scrollWidth / 2;

    if (canLoop) {
      if (dir === 1 && el.scrollLeft >= setWidth - 2) {
        el.scrollTo({ left: el.scrollLeft - setWidth, behavior: "auto" });
      } else if (dir === -1 && el.scrollLeft <= 2) {
        el.scrollTo({ left: el.scrollLeft + setWidth, behavior: "auto" });
      }
    }

    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  useEffect(() => {
    if (paused || !canLoop) return;
    const id = window.setInterval(() => {
      scroll(1);
    }, 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, canLoop, teachers.length]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        ref={ref}
        dir="ltr"
        className={cn(
          "flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {items.map((teacher, i) => (
          <div
            key={`${teacher.id}-${i}`}
            dir="rtl"
            className="w-[85%] shrink-0 snap-start sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]"
          >
            <TeacherCard teacher={teacher} />
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-start gap-2">
        <Button
          type="button"
          size="icon"
          className="size-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          aria-label="السابق"
          onClick={() => scroll(-1)}
        >
          <ChevronRight className="size-5" />
        </Button>
        <Button
          type="button"
          size="icon"
          className="size-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          aria-label="التالي"
          onClick={() => scroll(1)}
        >
          <ChevronLeft className="size-5" />
        </Button>
      </div>
    </div>
  );
}
