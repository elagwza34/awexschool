import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PublicNotFound() {
  return (
    <div className="container-shell py-16 text-center">
      <p className="font-serif text-7xl text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold">المحتوى ده مش موجود هنا</h1>
      <p className="my-4 text-muted-foreground">
        الرابط قد يكون غير صحيح، أو غير متاح في العرض التجريبي.
      </p>
      <Button asChild>
        <Link href="/courses">اكتشف المقررات المتاحة</Link>
      </Button>
    </div>
  );
}
