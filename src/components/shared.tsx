import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  Search,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Tone } from "@/features/catalog/types";

export const tones: Record<Tone, string> = {
  mint: "bg-[#f0f4f1] text-[#215d46]",
  peach: "bg-[#f7f3ee] text-[#8b4c28]",
  blue: "bg-[#f0f3f6] text-[#325e89]",
  lilac: "bg-[#f3f1f6] text-[#67528b]",
};

export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="مسار التنقل" className="mb-5">
      <ol className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
        <li>
          <Link
            className="inline-flex min-h-11 items-center hover:text-primary"
            href="/"
          >
            الرئيسية
          </Link>
        </li>
        {items.map((item, i) => (
          <li
            className="flex min-w-0 items-center gap-2"
            key={`${item.label}-${i}`}
          >
            <ChevronLeft aria-hidden="true" className="size-3 shrink-0" />
            {item.href ? (
              <Link
                className="inline-flex min-h-11 items-center hover:text-primary"
                href={item.href}
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
export function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="eyebrow">
            <Sparkles aria-hidden="true" className="size-4" />
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {description && (
          <p className="mt-3 text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "عرض الكل",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="section-title">{title}</h2>
        {description && (
          <p className="mt-2 text-muted-foreground">{description}</p>
        )}
      </div>
      {href && (
        <Button variant="ghost" asChild>
          <Link href={href}>
            {linkLabel}
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
      )}
    </div>
  );
}
export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-secondary px-2.5 py-1 text-xs font-bold text-primary",
        className,
      )}
    >
      {children}
    </span>
  );
}
export function EmptyState({
  title = "لم نجد نتائج مطابقة",
  description = "جرّب كلمة بحث أخرى أو غيّر الفلاتر لتكتشف محتوى مختلفًا.",
  href = "/courses",
  action = "استكشف كل المقررات",
}: {
  title?: string;
  description?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="soft-card px-4 py-10 text-center">
      <Search
        aria-hidden="true"
        className="mx-auto mb-4 size-10 text-primary"
      />
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
        {description}
      </p>
      <Button className="mt-4" variant="outline" asChild>
        <Link href={href}>{action}</Link>
      </Button>
    </div>
  );
}
export function DemoNotice({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "rounded-xl border border-dashed border-input bg-secondary/50 px-4 py-3 text-xs text-muted-foreground",
        className,
      )}
    >
      نسخة واجهة تجريبية · المحتوى والمدرسون والأسعار أمثلة توضيحية. لا يوجد
      تسجيل فعلي أو دفع أو اشتراك.
    </p>
  );
}
export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="liveschool — الرئيسية"
      className={cn(
        "inline-flex shrink-0 items-center gap-2.5",
        inverse && "text-white",
      )}
    >
      <Image
        src="/logo-green-96.webp"
        alt="liveschool"
        width={169}
        height={96}
        unoptimized
        className="my-1.5 h-16 w-auto"
      />
    </Link>
  );
}
