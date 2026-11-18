import Link from "next/link";
import { Brand } from "@/components/shared";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="container-shell flex min-h-screen flex-col items-center justify-center py-10 text-center"
    >
      <Brand />
      <p className="mt-7 font-serif text-8xl text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold">الصفحة دي مش في الخريطة</h1>
      <p className="my-4 text-muted-foreground">
        يمكن الرابط تغيّر، أو المحتوى غير موجود في العرض التجريبي.
      </p>
      <Button asChild>
        <Link href="/">نرجع للرئيسية</Link>
      </Button>
    </main>
  );
}
