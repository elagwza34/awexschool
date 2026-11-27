"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { CourseTrack } from "./types";

export function CatalogBrowser({
  initialQuery = "",
  initialGrade = "",
  initialSubject = "",
  fixedSubject,
  fixedTrack,
  search = false,
  resultCount,
  children,
  grades,
  subjects,
  unavailable,
}: {
  initialQuery?: string;
  initialGrade?: string;
  initialSubject?: string;
  fixedSubject?: string;
  fixedTrack?: CourseTrack;
  search?: boolean;
  resultCount: number;
  children: ReactNode;
  grades: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  unavailable: boolean;
}) {
  const [loading, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [grade, setGrade] = useState(initialGrade);
  const [subject, setSubject] = useState(fixedSubject ?? initialSubject);
  const router = useRouter();
  const pathname = usePathname();

  const apply = (q: string, g: string, s: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (g) params.set("grade", g);
    if (s && !fixedSubject) params.set("subject", s);
    if (fixedTrack) params.set("track", fixedTrack);
    startTransition(() => router.replace(`${pathname}${params.size ? `?${params}` : ""}`, {
      scroll: false,
    }));
  };
  return (
    <div className="pb-8">
      <form
        className="soft-card mb-5 grid items-end gap-3 p-4 md:grid-cols-[2fr_1fr_1fr_auto]"
        action={pathname}
        role="search"
        aria-label="البحث في المقررات"
      >
        {fixedTrack && <input type="hidden" name="track" value={fixedTrack} />}
        <div>
          <label
            className="mb-2 flex items-center gap-2 text-sm font-bold"
            htmlFor="catalog-query"
          >
            <Search aria-hidden="true" className="size-4" />
            {search ? "عن إيه بتدور؟" : "ابحث في المقررات"}
          </label>
          <input
            id="catalog-query"
            name="q"
            type="search"
            className="field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="مادة، مقرر، أو اسم مدرس..."
            maxLength={120}
          />
        </div>
        <div>
          <label
            htmlFor="catalog-grade"
            className="mb-2 block text-sm font-bold"
          >
            الصف الدراسي
          </label>
          <select
            id="catalog-grade"
            name="grade"
            className="field"
            value={grade}
            onChange={(e) => {
              setGrade(e.target.value);
              apply(query, e.target.value, subject);
            }}
          >
            <option value="">كل الصفوف</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="catalog-subject"
            className="mb-2 block text-sm font-bold"
          >
            المادة
          </label>
          <select
            id="catalog-subject"
            name="subject"
            disabled={!!fixedSubject}
            className="field disabled:bg-muted"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              apply(query, grade, e.target.value);
            }}
          >
            <option value="">كل المواد</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" className="min-h-11">
          <SlidersHorizontal aria-hidden="true" />
          تطبيق
        </Button>
      </form>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p
          role="status"
          aria-live="polite"
          className="min-w-0 flex-1 break-words text-sm text-muted-foreground"
        >
          {loading ? "جاري التحميل..." : unavailable ? "تعذّر تحميل نتائج البحث" : resultCount ? resultCount + " مقررات" : "لا توجد نتائج"}
          {initialQuery && !unavailable && <> تطابق «{initialQuery}»</>}
        </p>
        {(query || grade || (!fixedSubject && subject)) && (
          <Button
            variant="ghost"
            onClick={() => {
              setQuery("");
              setGrade("");
              setSubject(fixedSubject ?? "");
              apply("", "", fixedSubject ?? "");
            }}
          >
            <X aria-hidden="true" />
            مسح الفلاتر
          </Button>
        )}
      </div>
      {unavailable ? <p role="alert" className="soft-card p-5">تعذّر تحميل بيانات المقررات حاليًا.</p> : resultCount ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {children}
        </div>
      ) : (
        <>
          <EmptyState />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            أو{" "}
            <Link
              className="font-bold text-primary underline underline-offset-4"
              href="/stages"
            >
              ارجع لاختيار المرحلة الدراسية
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
