import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/shared";

export function ManagementHeader({
  title,
  description,
  role,
}: {
  title: string;
  description: string;
  role: "teacher" | "admin";
}) {
  return (
    <div className="mb-5">
      <nav
        aria-label="مسار اللوحة"
        className="mb-4 flex items-center gap-2 text-xs text-muted-foreground"
      >
        <Link
          href={`/${role}`}
          className="inline-flex min-h-11 items-center hover:text-primary"
        >
          {role === "teacher" ? "لوحة المدرس" : "لوحة الإدارة"}
        </Link>
        <ChevronLeft aria-hidden="true" className="size-3" />
        <span aria-current="page">{title}</span>
      </nav>
      <Badge className="mb-3 bg-white text-muted-foreground">
        معاينة تفاعلية · بدون حفظ دائم
      </Badge>
      <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
