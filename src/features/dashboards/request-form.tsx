"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useStaffPreview } from "./staff-context";
import { RequestReplies } from "./request-replies";
import { requestStatusLabels, type RequestSource, type StaffRequest } from "./staff-data";

export function RequestForm({ source }: { source: RequestSource }) {
  const { submitRequest, requests } = useStaffPreview();
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<StaffRequest>();
  const history = requests.filter((request) => request.source === source);
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">قدّم شكوى أو طلب</h1>
        <p className="text-sm leading-7 text-muted-foreground">
          ابعت شكوتك أو استفسارك للدعم الفني. استخدم بيانات تجريبية، والطلب بيتحفظ أثناء التنقّل في المعاينة.
        </p>
      </header>
      <form className="soft-card grid max-w-3xl gap-4 p-4 sm:p-6" onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const read = (key: string) => String(data.get(key) ?? "");
        const result = submitRequest(source, {
          title: read("title"), details: read("details"),
          name: read("name"), email: read("email"),
        });
        if (!result.ok) { setReceipt(undefined); setError(result.error); return; }
        setError("");
        setReceipt(result.request);
        form.reset();
      }}>
        {source === "visitor" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">اسمك
              <input className="field" name="name" minLength={2} maxLength={100} required />
            </label>
            <label className="grid gap-2 text-sm font-semibold">البريد الإلكتروني
              <input className="field" type="email" name="email" dir="ltr" maxLength={254} required />
            </label>
          </div>
        ) : <p className="text-sm text-muted-foreground">هيتسجل الطلب باسم وبريد حسابك التجريبي.</p>}
        <label className="grid gap-2 text-sm font-semibold">عنوان الطلب
          <input className="field" name="title" minLength={5} maxLength={120} required />
        </label>
        <label className="grid gap-2 text-sm font-semibold">تفاصيل الطلب
          <textarea className="field min-h-28 resize-y py-2" name="details" minLength={10} maxLength={2000} required />
        </label>
        {error && (
          <div role="alert" className="text-sm text-destructive">
            <p>{error}</p>
            {error.startsWith("الحساب غير نشط") && <Link href="/contact" className="inline-flex min-h-11 items-center underline">فتح فورم الزائر</Link>}
          </div>
        )}
        {receipt && <p role="status" className="rounded-lg bg-secondary p-3 text-sm font-semibold">
          تم تسجيل الطلب لدى الدعم الفني في المعاينة. رقم المتابعة <bdi>{receipt.id}</bdi>.
        </p>}
        {source === "visitor" && <Link href="/track-request" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline">متابعة طلب</Link>}
        <Button type="submit" className="justify-self-start">إرسال الطلب في المعاينة</Button>
      </form>
      {source !== "visitor" && (
        <section className="soft-card max-w-3xl space-y-3 p-4">
          <h2 className="text-lg font-bold">متابعة طلباتي</h2>
          {history.length ? (
            <ul className="divide-y">
              {history.map((item) => (
                <li key={item.id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0"><p className="font-semibold break-words">{item.title}</p><bdi className="text-xs text-muted-foreground">{item.id}</bdi></div>
                    <span className="rounded-md bg-secondary px-2 py-1">{requestStatusLabels[item.status]}</span>
                  </div>
                  <RequestReplies replies={item.replies} />
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">مفيش طلبات من الحساب ده لسه.</p>}
        </section>
      )}
    </div>
  );
}
